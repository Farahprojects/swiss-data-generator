/**
 * 🔄 CONVERSATION LOOP HOOK - Self-contained conversation state management
 * 
 * This hook manages the entire conversation flow:
 * - Local conversation state (idle, listening, processing, replying, error)
 * - Microphone lifecycle
 * - STT transcription
 * - LLM message sending
 * - TTS playback
 * - Return to listening
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversationMicrophone } from '@/hooks/microphone/useConversationMicrophone';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { sttService } from '@/services/voice/stt';

export type ConversationState = 'idle' | 'listening' | 'processing' | 'replying' | 'error';

interface ConversationLoopOptions {
  chat_id: string;
  onError?: (error: Error) => void;
}

export const useConversationLoop = ({ chat_id, onError }: ConversationLoopOptions) => {
  const [state, setState] = useState<ConversationState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const isActiveRef = useRef(false);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const isTtsInProgressRef = useRef(false); // Guard against listening during TTS

  // Get current chat messages to send with context
  const messages = useChatStore((state) => state.messages);

  const microphone = useConversationMicrophone({
    onRecordingComplete: handleRecordingComplete,
    onError: handleMicrophoneError,
  });

  // Handle successful recording completion
  async function handleRecordingComplete(audioBlob: Blob) {
    if (!isActiveRef.current) return;

    console.log('[ConversationLoop] Audio recorded, transcribing...');
    setState('processing');

    try {
      // Transcribe audio
      const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation', sessionIdRef.current);
      const transcript = result.transcript;
      
      if (!transcript?.trim()) {
        console.log('[ConversationLoop] Empty transcript, returning to listening');
        startListening();
        return;
      }

      console.log('[ConversationLoop] Transcript:', transcript);

      // Send message to LLM
      await sendMessageToLLM(transcript);

    } catch (error) {
      console.error('[ConversationLoop] Processing error:', error);
      handleError(new Error('Failed to process audio'));
    }
  }

  // Handle microphone errors
  function handleMicrophoneError(error: Error) {
    console.error('[ConversationLoop] Microphone error:', error);
    handleError(error);
  }

  // Send user message and get assistant response
  async function sendMessageToLLM(userMessage: string) {
    if (!isActiveRef.current) return;

    try {
      console.log('[ConversationLoop] Sending message to LLM...');

      // Add user message to store
      useChatStore.getState().addMessage({
        id: `user_${Date.now()}`,
        chat_id,
        role: 'user',
        text: userMessage,
        createdAt: new Date().toISOString()
      });

      // Prepare conversation context
      const conversationMessages = [
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.text
        })),
        { role: 'user' as const, content: userMessage }
      ];

      // Call LLM via Supabase edge function
      const { data, error: llmError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: conversationMessages,
          chat_id,
          session_id: sessionIdRef.current
        }
      });

      if (llmError) throw llmError;

      const assistantMessage = data?.message || 'I apologize, but I didn\'t receive a proper response.';

      // Add assistant message to store
      useChatStore.getState().addMessage({
        id: `assistant_${Date.now()}`,
        chat_id,
        role: 'assistant',
        text: assistantMessage,
        createdAt: new Date().toISOString()
      });

      // Start TTS playback
      await playAssistantResponse(assistantMessage);

    } catch (error) {
      console.error('[ConversationLoop] LLM error:', error);
      handleError(new Error('Failed to get response from AI'));
    }
  }

  // Play assistant response via TTS
  async function playAssistantResponse(text: string) {
    if (!isActiveRef.current) return;

    try {
      console.log('[ConversationLoop] Starting TTS playback...');
      setState('replying');
      isTtsInProgressRef.current = true; // Set TTS guard

      await conversationTtsService.speakAssistant({
        text,
        chat_id,
        messageId: `assistant_${Date.now()}`,
        sessionId: sessionIdRef.current,
        onComplete: () => {
          isTtsInProgressRef.current = false; // Clear TTS guard
          if (isActiveRef.current) {
            console.log('[ConversationLoop] TTS completed, returning to listening');
            startListening();
          }
        }
      });

    } catch (error) {
      console.error('[ConversationLoop] TTS error:', error);
      isTtsInProgressRef.current = false; // Clear TTS guard on error
      // Continue conversation even if TTS fails
      if (isActiveRef.current) {
        startListening();
      }
    }
  }

  // Start listening for user input
  const startListening = useCallback(async () => {
    if (!isActiveRef.current) return;
    
    // Guard against starting listening while TTS is in progress
    if (isTtsInProgressRef.current) {
      console.log('[ConversationLoop] Skipping startListening - TTS in progress');
      return;
    }

    try {
      console.log('[ConversationLoop] Starting to listen...');
      setState('listening');
      
      const success = await microphone.startRecording();
      if (!success) {
        throw new Error('Failed to start recording');
      }
    } catch (error) {
      console.error('[ConversationLoop] Failed to start listening:', error);
      handleError(new Error('Failed to start microphone'));
    }
  }, [microphone]);

  // Handle errors and attempt recovery
  function handleError(error: Error) {
    console.error('[ConversationLoop] Error:', error);
    setError(error);
    setState('error');
    onError?.(error);

    // Attempt to recover after 2 seconds
    setTimeout(() => {
      if (isActiveRef.current && state === 'error') {
        console.log('[ConversationLoop] Attempting to recover...');
        setError(null);
        startListening();
      }
    }, 2000);
  }

  // Start the conversation loop
  const start = useCallback(async () => {
    if (isActiveRef.current) return;

    console.log('[ConversationLoop] Starting conversation loop');
    isActiveRef.current = true;
    setError(null);
    setState('idle');

    // TTS audio context already unlocked in ConversationOverlay.handleStart
    // within the user gesture, so we don't need to call it again here

    // Start listening immediately
    await startListening();
  }, [startListening]);

  // Stop the conversation loop
  const stop = useCallback(() => {
    console.log('[ConversationLoop] Stopping conversation loop');
    isActiveRef.current = false;
    isTtsInProgressRef.current = false; // Clear TTS guard
    
    // Stop microphone
    if (microphone.isRecording) {
      microphone.cancelRecording();
    }
    
    // Stop TTS
    conversationTtsService.stopAllAudio();
    
    setState('idle');
    setError(null);
  }, [microphone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    error,
    start,
    stop,
    isActive: isActiveRef.current
  };
};