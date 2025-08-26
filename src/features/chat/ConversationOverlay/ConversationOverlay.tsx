import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { supabase } from '@/integrations/supabase/client';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation

  // Simple conversation state
  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting'>('listening');
  
  // Load session ID once at start - use for entire conversation
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    // 1. Force cleanup of microphone service to release all streams and contexts
    conversationMicrophoneService.forceCleanup();
    
    // 2. Close the UI and reset all state
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    setConversationState('listening');
  };

  const handleStart = () => {
    // One-shot guard to prevent double invocation
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    if (isStarting) return; // Prevent double taps
    setIsStarting(true);

    if (!chat_id) {
      console.error("[ConversationOverlay] Cannot start conversation without a chat_id");
      closeConversation();
      return;
    }

    // 🔥 CRITICAL: Unlock TTS audio FIRST within user gesture
    conversationTtsService.unlockAudio();
    console.log('[ConversationOverlay] TTS audio unlocked within user gesture');

    // Set flags for instant UI feedback - go straight to listening mode
    setPermissionGranted(true);
    
    // Start simple conversation flow - no complex hooks
    startSimpleConversation();
  };

  // Simple conversation flow - nothing can mess with this
  const startSimpleConversation = async () => {
    try {
      console.log('[ConversationOverlay] Starting simple conversation flow');
      
      // 1. Get microphone permission and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      });
      
      // 2. Cache stream for reuse
      conversationMicrophoneService.cacheStream(stream);
      
      // 3. Set up simple callback for when recording completes
      conversationMicrophoneService.initialize({
        onRecordingComplete: handleSimpleRecordingComplete,
        onError: (error) => {
          console.error('[ConversationOverlay] Recording error:', error);
          setConversationState('connecting');
        },
        silenceTimeoutMs: 2000 // 2 seconds - same as mic icon
      });
      
      // 4. Start recording with VAD
      const success = await conversationMicrophoneService.startRecording();
      if (!success) {
        throw new Error('Failed to start recording');
      }
      
      setConversationState('listening');
      console.log('[ConversationOverlay] Simple conversation started - waiting for speech');
      
    } catch (error) {
      console.error('[ConversationOverlay] Failed to start simple conversation:', error);
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
    }
  };

  // Simple STT processing - nothing can mess with this
  const handleSimpleRecordingComplete = async (audioBlob: Blob) => {
    try {
      console.log('[ConversationOverlay] 🔥 Simple recording complete, processing STT...');
      console.log('[ConversationOverlay] Audio blob size:', audioBlob.size, 'bytes');
      setConversationState('processing');
      
      // Direct STT call - use same style as mic icon
      const { data: sttData, error: sttError } = await supabase.functions.invoke('google-speech-to-text', {
        body: audioBlob,
        headers: {
          'X-Meta': JSON.stringify({
            mode: 'conversation',
            sessionId: sessionIdRef.current,
            config: {
              encoding: 'WEBM_OPUS',
              languageCode: 'en-US',
              enableAutomaticPunctuation: true,
              model: 'latest_long'
            }
          })
        }
      });

      if (sttError) {
        throw new Error(`STT error: ${sttError.message}`);
      }
      
      const transcript = sttData?.transcript || '';
      
      if (!transcript?.trim()) {
        console.log('[ConversationOverlay] Empty transcript, returning to listening');
        setConversationState('listening');
        return;
      }
      
      console.log('[ConversationOverlay] Transcript:', transcript);
      
      // Direct LLM-HANDLER call - get response immediately
      const client_msg_id = `conv_${Date.now()}`;
      const { data, error } = await supabase.functions.invoke('llm-handler', {
        body: {
          chat_id: chat_id || '',
          text: transcript,
          client_msg_id,
          mode: 'conversation',
          sessionId: sessionIdRef.current,
          messages: useChatStore.getState().messages // Send conversation context
        }
      });
      
      if (error) {
        throw new Error(`LLM Handler error: ${error.message}`);
      }
      
      const assistantMessage = data?.text || 'I apologize, but I didn\'t receive a proper response.';
      console.log('[ConversationOverlay] Assistant response:', assistantMessage);
      
      // Add messages to store
      const userMessageId = `user_${Date.now()}`;
      const assistantMessageId = `assistant_${Date.now()}`;
      
      useChatStore.getState().addMessage({
        id: userMessageId,
        chat_id: chat_id || '',
        role: 'user',
        text: transcript,
        createdAt: new Date().toISOString()
      });
      
      useChatStore.getState().addMessage({
        id: assistantMessageId,
        chat_id: chat_id || '',
        role: 'assistant',
        text: assistantMessage,
        createdAt: new Date().toISOString()
      });
      
      // Direct TTS call - no complex hooks
      setConversationState('replying');
      await conversationTtsService.speakAssistant({
        chat_id: chat_id || '',
        messageId: assistantMessageId,
        text: assistantMessage,
        sessionId: sessionIdRef.current,
        onComplete: async () => {
          console.log('[ConversationOverlay] TTS complete, returning to listening');
          setConversationState('listening');
          
          // Start listening again for next turn
          try {
            const success = await conversationMicrophoneService.startRecording();
            if (!success) {
              console.error('[ConversationOverlay] Failed to start recording after TTS');
              setConversationState('connecting');
            } else {
              console.log('[ConversationOverlay] Recording started for next turn');
            }
          } catch (error) {
            console.error('[ConversationOverlay] Error starting recording after TTS:', error);
            setConversationState('connecting');
          }
        }
      });
      
    } catch (error) {
      console.error('[ConversationOverlay] Simple processing error:', error);
      setConversationState('connecting');
    }
  };
  


  // Use simple conversation state
  const state = conversationState;

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
      <div className="h-full w-full flex items-center justify-center px-6">
        {!permissionGranted ? (
          <div 
            className="text-center text-gray-800 flex flex-col items-center gap-4 cursor-pointer"
            onClick={handleStart}
          >
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
              <Mic className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-light">Tap to Start Conversation</h2>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <VoiceBubble state={state} audioLevel={audioLevel} />
              </motion.div>
            </AnimatePresence>
            
            <p className="text-gray-500 font-light">
              {state === 'listening' ? 'Listening…' : 
               state === 'processing' ? 'Thinking…' : 'Speaking…'}
            </p>
            

            
            {/* Close button - positioned under the status text */}
            <button
              onClick={handleModalClose}
              aria-label="Close conversation"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
