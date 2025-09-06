import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useConversationRealtimeAudioLevel } from '@/hooks/useConversationRealtimeAudioLevel';
import { VoiceBubble } from './VoiceBubble';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { ttsPlaybackService } from '@/services/voice/TTSPlaybackService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

type ConversationState = 'listening' | 'thinking' | 'replying' | 'connecting' | 'establishing';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const [state, setState] = useState<ConversationState>('connecting');
  
  const audioLevel = useConversationRealtimeAudioLevel({
    updateIntervalMs: 50,
    smoothingFactor: 0.8,
  });
  
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);

  // WebSocket connection setup
  const establishConnection = useCallback(async () => {
    if (!chat_id || connectionRef.current) return true;
    
    try {
      const connection = supabase.channel(`conversation:${chat_id}`);
      
      connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
        if (payload.audioBytes && !isShuttingDown.current) {
          playAudioImmediately(payload.audioBytes);
        }
      });
      
      connection.subscribe();
      connectionRef.current = connection;
      return true;
    } catch (error) {
      console.error('[ConversationOverlay] Connection failed:', error);
      return false;
    }
  }, [chat_id]);

  // TTS playback
  const playAudioImmediately = useCallback(async (audioBytes: number[]) => {
    if (isShuttingDown.current) return;
    
    try {
      setState('replying');
      conversationMicrophoneService.mute();

      // Pause WebSocket during playback
      if (connectionRef.current?.state === 'SUBSCRIBED') {
        connectionRef.current.unsubscribe();
      }

      await ttsPlaybackService.play(audioBytes, () => {
        setState('listening');
        
        // Resume WebSocket
        if (connectionRef.current?.state === 'CLOSED') {
          connectionRef.current.subscribe();
        }

        // Unmute microphone and start recording for next turn
        if (!isShuttingDown.current) {
          setTimeout(async () => {
            if (!isShuttingDown.current) {
              conversationMicrophoneService.unmute();
              // Start recording to actually begin listening
              await conversationMicrophoneService.startRecording();
            }
          }, 200);
        }
      });
    } catch (error) {
      console.error('[ConversationOverlay] TTS playback failed:', error);
      setState('connecting');
    }
  }, []);

  // Start conversation
  const handleStart = useCallback(async () => {
    if (hasStarted.current || !chat_id) return;
    
    hasStarted.current = true;
    setState('establishing');
    
    try {
      // USER GESTURE ENFORCEMENT: Initialize and start recording IMMEDIATELY
      // No async operations before getUserMedia() to maintain gesture context
      console.log('[ConversationOverlay] 🆕 Cache-free mode: Microphone service will create fresh streams per turn');
      
      // Initialize microphone service
      conversationMicrophoneService.initialize({
        onRecordingComplete: (audioBlob: Blob) => processRecording(audioBlob),
        onError: (error: Error) => {
          console.error('[ConversationOverlay] Microphone error:', error);
          setState('connecting');
        },
        silenceTimeoutMs: 1200,
      });
      
      // 1️⃣ IMMEDIATELY request microphone access inside the gesture
      const recordingStarted = await conversationMicrophoneService.startRecording();
      
      // 2️⃣ Setup WebSocket AFTER we have the stream (outside gesture context is OK now)
      await establishConnection();
      
      if (recordingStarted) {
        setState('listening');
      } else {
        setState('connecting');
      }
      
    } catch (error) {
      console.error('[ConversationOverlay] Start failed:', error);
      setState('connecting');
    }
  }, [chat_id, establishConnection]);

  // Process recording
  const processRecording = useCallback(async (audioBlob: Blob) => {
    if (!chat_id || isProcessingRef.current || state === 'thinking' || state === 'replying') {
      return;
    }
    
    isProcessingRef.current = true;
    setState('thinking');
    
    try {
      // STT transcription
      const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation');
      const transcript = result.transcript?.trim();
      
      if (!transcript) {
        setState('listening');
        // Unmute microphone and start recording for next turn even if no transcript
        conversationMicrophoneService.unmute();
        await conversationMicrophoneService.startRecording();
        return;
      }
      
      // Send to LLM
      await llmService.sendMessage({
        chat_id,
        text: transcript,
        client_msg_id: uuidv4(),
        mode: 'conversation'
      });
      
    } catch (error) {
      console.error('[ConversationOverlay] Processing failed:', error);
      setState('connecting');
      // Unmute microphone and start recording even on error to allow retry
      conversationMicrophoneService.unmute();
      await conversationMicrophoneService.startRecording();
    } finally {
      isProcessingRef.current = false;
    }
  }, [chat_id, state]);

  // Cleanup on modal close
  const handleModalClose = useCallback(async () => {
    isShuttingDown.current = true;
    
    // Stop TTS
    try {
      await ttsPlaybackService.destroy();
    } catch (e) {
      console.warn('[ConversationOverlay] Could not destroy TTS:', e);
    }

    // Stop microphone
    try {
      conversationMicrophoneService.forceCleanup();
    } catch (e) {
      console.warn('[ConversationOverlay] Could not stop microphone:', e);
    }
    
    // Close WebSocket
    if (connectionRef.current) {
      connectionRef.current.unsubscribe();
      connectionRef.current = null;
    }
    
    // Reset state
    setState('connecting');
    hasStarted.current = false;
    isShuttingDown.current = false;
    
    closeConversation();
  }, [closeConversation]);

  // SSR guard
  if (!isConversationOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-white pt-safe pb-safe"
      data-conversation-overlay
    >
      <div className="h-full w-full flex items-center justify-center px-6">
        {state === 'connecting' ? (
          <div className="text-center text-gray-800 flex flex-col items-center gap-4">
            <div
              className="flex flex-col items-center gap-4 cursor-pointer"
              onClick={handleStart}
            >
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
                <Mic className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light">
                Tap to Start Conversation
              </h2>
            </div>
            <button
              onClick={closeConversation}
              aria-label="Close conversation"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
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
              {state === 'establishing'
                ? 'Establishing connection…'
                : state === 'listening'
                ? 'Listening…'
                : state === 'thinking'
                ? 'Thinking…'
                : 'Speaking…'}
            </p>

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