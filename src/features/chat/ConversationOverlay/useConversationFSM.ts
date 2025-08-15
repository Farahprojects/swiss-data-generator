import { useState, useEffect } from 'react';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useSpeechToText } from '@/hooks/useSpeechToText';

export type ConversationState = 'listening' | 'processing' | 'replying';

export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('listening');
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);

  // Handle transcript ready - process AI response
  const handleTranscriptReady = async (transcript: string) => {
    if (!isConversationOpen) return;
    
    console.log('[ConversationFSM] Transcript ready, processing AI response:', transcript);
    setState('processing');

    try {
      // Add user message (text only - no audio storage)
      console.log('[ConversationFSM] Adding user message to store (text-only)...');
      addMessage({ 
        id: crypto.randomUUID(), 
        conversationId, 
        role: 'user', 
        text: transcript, 
        createdAt: new Date().toISOString()
        // Note: No audioUrl - we only persist text
      });
      
      // Get AI response
      console.log('[ConversationFSM] Calling LLM service...');
      const assistantMsg = await llmService.chat({ conversationId, userMessage: { text: transcript } });
      console.log('[ConversationFSM] LLM response received:', assistantMsg.text?.substring(0, 50) + '...');
      
      // Add assistant message (text only - no audio URL stored)
      console.log('[ConversationFSM] Adding assistant message to store (text-only)...');
      addMessage({
        ...assistantMsg,
        // Explicitly remove audioUrl if present - we only persist text
        audioUrl: undefined
      });
      
      // Generate and play TTS (live audio, not stored)
      console.log('[ConversationFSM] Transitioning to replying state');
      setState('replying');
      
      console.log('[ConversationFSM] Starting TTS conversion (live audio)...');
      const audioUrl = await ttsService.speak(assistantMsg.id, assistantMsg.text);
      console.log('[ConversationFSM] TTS data URL received for immediate playback');
      
      console.log('[ConversationFSM] Starting live audio playback (no storage)...');
      audioPlayer.play(audioUrl, () => {
        console.log('[ConversationFSM] Audio playback completed');
        if (useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Starting next recording turn...');
          setState('listening');
          // Start recording again for next turn
          setTimeout(() => {
            if (useConversationUIStore.getState().isConversationOpen && !speechToText.isRecording) {
              speechToText.startRecording();
            }
          }, 500); // Small delay to ensure clean transition
        } else {
          console.log('[ConversationFSM] Overlay closed during playback');
        }
      });
      
    } catch (err) {
      console.error('[ConversationFSM] Error in conversation flow:', err);
      
      // Return to listening with delay on error
      setTimeout(() => {
        if (useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Error recovery - returning to listening');
          setState('listening');
        }
      }, 2000);
    }
  };

  // Handle silence detected - just log it (useSpeechToText handles the auto-stop)
  const handleSilenceDetected = () => {
    console.log('[ConversationFSM] Silence detected, processing will start automatically');
  };

  // Use the proven mic button STT logic
  const speechToText = useSpeechToText(handleTranscriptReady, handleSilenceDetected);

  // Start recording when conversation opens and in listening state
  useEffect(() => {
    if (state === 'listening' && isConversationOpen && !speechToText.isRecording && !speechToText.isProcessing) {
      console.log('[ConversationFSM] Starting recording for listening state');
      speechToText.startRecording();
    }
  }, [state, isConversationOpen]);

  // Stop recording when conversation closes
  useEffect(() => {
    if (!isConversationOpen && speechToText.isRecording) {
      console.log('[ConversationFSM] Conversation closed, stopping recording');
      speechToText.stopRecording();
    }
  }, [isConversationOpen]);

  return { 
    state,
    isRecording: speechToText.isRecording,
    isProcessing: speechToText.isProcessing,
    audioLevel: speechToText.audioLevel
  };
};
