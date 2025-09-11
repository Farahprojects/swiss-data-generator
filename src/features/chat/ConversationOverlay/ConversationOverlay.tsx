import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
// Old audio level hook removed - using AudioWorklet + WebWorker pipeline
import { VoiceBubble } from './VoiceBubble';
// New audio pipeline (AudioWorklet + WebWorker)
import { ConversationAudioPipeline, encodeWav16kMono } from '@/services/audio/ConversationAudioPipeline';
import { ttsPlaybackService } from '@/services/voice/TTSPlaybackService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

type ConversationState = 'listening' | 'thinking' | 'replying' | 'connecting' | 'establishing';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const [state, setState] = useState<ConversationState>('connecting');
  
  // Realtime level driven by worker (not React polling) - use ref for smooth animation
  const audioLevelRef = useRef<number>(0);
  
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const pipelineRef = useRef<ConversationAudioPipeline | null>(null);

  // 🚨 RESET TO TAP TO START - Elegant single function for all error recovery
  const resetToTapToStart = useCallback(async (reason: string) => {
    console.log(`[ConversationOverlay] 🔄 Reset to tap-to-start: ${reason}`);
    
    // Stop any ongoing operations
    isShuttingDown.current = true;
    isProcessingRef.current = false;
    
    // DISABLE TTS MODE - Flush buffered messages back to text mode
    try {
      const { chatController } = await import('@/features/chat/ChatController');
      chatController.setTtsMode(false);
    } catch (e) {
      console.error('[ConversationOverlay] Failed to disable TTS mode:', e);
    }
    
    // Force cleanup all resources (fire-and-forget)
    ttsPlaybackService.destroy().catch(() => {});
    try { pipelineRef.current?.dispose(); } catch {}
    
    // Cleanup WebSocket connection
    if (connectionRef.current) {
      try {
        connectionRef.current.unsubscribe();
      } catch (e) {
        // Ignore WebSocket cleanup errors
      }
      connectionRef.current = null;
    }
    
    // Reset audio arbitrator
    try {
      const { audioArbitrator } = require('@/services/audio/AudioArbitrator');
      audioArbitrator.forceReleaseAll();
    } catch (e) {
      // Ignore arbitrator errors
    }
    
    // Always return to tap-to-start state (no error UI)
    setState('connecting');
    hasStarted.current = false;
    isShuttingDown.current = false;
  }, []);

  // WebSocket connection setup
  const establishConnection = useCallback(async () => {
    if (!chat_id || connectionRef.current) return true;
    
    try {
      console.log(`[ConversationOverlay] 🔌 Establishing TTS WebSocket for chat_id: ${chat_id}`);
      const connection = supabase.channel(`conversation:${chat_id}`);
      
      connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
        console.log('[ConversationOverlay] 🎵 TTS audio received via WebSocket');
        if (payload.audioBytes && !isShuttingDown.current) {
          playAudioImmediately(payload.audioBytes);
        }
      });
      
      connection.on('broadcast', { event: 'thinking-mode' }, ({ payload }) => {
        console.log('[ConversationOverlay] 🤔 Thinking mode received via WebSocket');
        if (!isShuttingDown.current) {
          setState('thinking');
        }
      });
      
      connection.subscribe((status) => {
        console.log(`[ConversationOverlay] 🔌 TTS WebSocket status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('[ConversationOverlay] ✅ TTS WebSocket connected successfully');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[ConversationOverlay] ❌ TTS WebSocket failed: ${status}`);
          resetToTapToStart(`TTS WebSocket ${status}`);
        }
      });
      
      connectionRef.current = connection;
      return true;
    } catch (error) {
      console.error('[ConversationOverlay] Connection failed:', error);
      resetToTapToStart('WebSocket connection failed');
      return false;
    }
  }, [chat_id]);

  // TTS playback
  const playAudioImmediately = useCallback(async (audioBytes: number[]) => {
    if (isShuttingDown.current) return;
    
    try {
      setState('replying'); // 7. Change UI to "speaking"
      
      // 7. Unpause media source for TTS
      await ttsPlaybackService.play(audioBytes, () => {
        setState('listening');
        
        // Resume mic for next turn
        if (!isShuttingDown.current) {
          setTimeout(() => {
            if (!isShuttingDown.current) {
              try { pipelineRef.current?.resume(); } catch {}
            }
          }, 200);
        }
      });
    } catch (error) {
      console.error('[ConversationOverlay] TTS playback failed:', error);
      resetToTapToStart('TTS playback failed');
    }
  }, []);

  // Start conversation
  const handleStart = useCallback(async () => {
    if (hasStarted.current || !chat_id) return;
    
    hasStarted.current = true;
    setState('establishing');
    
    try {
      // 1. User gesture captured
      
      // 2. ENABLE TTS MODE - Buffer text messages instead of pausing
      const { chatController } = await import('@/features/chat/ChatController');
      chatController.setTtsMode(true);
      
      // 3. Initialize WS + Audio Warmup
      const { ttsPlaybackService } = await import('@/services/voice/TTSPlaybackService');
      await ttsPlaybackService.warmup();
      
      // Setup WebSocket connection
      console.log('[ConversationOverlay] 🚀 Starting conversation setup...');
      const connectionEstablished = await establishConnection();
      if (!connectionEstablished) {
        throw new Error('Failed to establish TTS WebSocket connection');
      }
      
      // 3. Initialize AudioWorklet + WebWorker
      pipelineRef.current = new ConversationAudioPipeline({
        onSpeechStart: () => {
          if (!isShuttingDown.current) setState('listening');
        },
        onSpeechSegment: async (pcm: Float32Array) => {
          if (isShuttingDown.current || isProcessingRef.current || state === 'thinking' || state === 'replying') {
            return;
          }
          isProcessingRef.current = true;
          setState('thinking'); // 6. Pause mic after silence → Change UI to "thinking"
          try {
            // Pause mic during STT
            try { pipelineRef.current?.pause(); } catch {}
            const wav = encodeWav16kMono(pcm, 16000);
            await sttService.transcribe(wav, chat_id, {}, 'conversation');
            // TTS will arrive over WS and change UI to "speaking"
          } catch (error) {
            console.error('[ConversationOverlay] Processing failed:', error);
            resetToTapToStart('STT processing failed');
          } finally {
            isProcessingRef.current = false;
          }
        },
        onLevel: (level) => {
          if (!isShuttingDown.current) audioLevelRef.current = level; // 5. Monitor energy signal for animation
        },
        onError: (error: Error) => {
          console.error('[ConversationOverlay] Audio pipeline error:', error);
          resetToTapToStart('Audio pipeline error');
        }
      });
      await pipelineRef.current.init();
      await pipelineRef.current.start();
      
      // 4. Ready State → Mic on → Proceed to listening
      setState('listening');
      console.log('[ConversationOverlay] ✅ Conversation setup complete - ready to listen');
      
    } catch (error) {
      console.error('[ConversationOverlay] Start failed:', error);
      resetToTapToStart('Conversation start failed');
    }
  }, [chat_id, establishConnection]);

  // Legacy recording path handled by pipeline via onSpeechSegment

  // Cleanup on modal close - graceful release with fire-and-forget
  const handleModalClose = useCallback(async () => {
    isShuttingDown.current = true;
    
    // Fire-and-forget TTS release
    ttsPlaybackService.destroy().catch(() => {});

    // Fire-and-forget microphone release
    try { pipelineRef.current?.dispose(); } catch {}
    
    // Fire-and-forget WebSocket cleanup
    if (connectionRef.current) {
      try {
        connectionRef.current.unsubscribe();
      } catch (e) {
        // Ignore WebSocket cleanup errors
      }
      connectionRef.current = null;
    }
    
    // ▶️ DISABLE TTS MODE: Flush buffered messages back to text mode (fire-and-forget)
    import('@/features/chat/ChatController').then(({ chatController }) => {
      try {
        chatController.setTtsMode(false);
      } catch (error) {
        // Ignore mode switch errors
      }
    }).catch(() => {
      // Ignore import errors
    });
    
    // Reset state
    setState('connecting');
    hasStarted.current = false;
    isShuttingDown.current = false;
    
    closeConversation();
  }, [closeConversation]);

  // Reset to tap-to-start when entering connecting state (idempotent cleanup)
  useEffect(() => {
    if (state === 'connecting') {
      // Idempotent cleanup when returning to tap-to-start
      if (connectionRef.current) {
        connectionRef.current.unsubscribe().catch(() => {});
        connectionRef.current = null;
      }
      try { pipelineRef.current?.dispose(); } catch {}
      ttsPlaybackService.destroy().catch(() => {});
    }
  }, [state]);

  // Cleanup on unmount to prevent WebSocket race condition
  useEffect(() => {
    return () => {
      resetToTapToStart('Component unmounted');
    };
  }, [resetToTapToStart]);

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
              onClick={() => {
                // Reset everything before restarting
                resetToTapToStart('User tapped to restart');
                handleStart();
              }}
            >
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200 relative">
                <Mic className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light">
                Tap to Start
              </h2>
            </div>
            <button
              onClick={handleModalClose}
              aria-label="Close conversation"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : state === 'establishing' ? (
          <div className="text-center text-gray-800 flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Slow single-rotation spinner ring around the grey circle */}
              <div className="absolute -inset-2 rounded-full border-2 border-gray-300 border-t-gray-600" style={{ animation: 'spin 2s linear 1' }}></div>
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center relative z-10">
                <Mic className="w-10 h-10 text-gray-600" />
              </div>
            </div>
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
                <VoiceBubble state={state} audioLevelRef={audioLevelRef} />
              </motion.div>
            </AnimatePresence>

            <p className="text-gray-500 font-light">
              {state === 'listening'
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