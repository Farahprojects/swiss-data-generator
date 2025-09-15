import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useAudioStore } from '@/stores/audioStore';
// Old audio level hook removed - using AudioWorklet + WebWorker pipeline
import { VoiceBubble } from './VoiceBubble';
// Universal audio pipeline
import { UniversalSTTRecorder } from '@/services/audio/UniversalSTTRecorder';
import { ttsPlaybackService } from '@/services/voice/TTSPlaybackService';
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
  
  // Audio context management
  const { audioContext, isAudioUnlocked, initializeAudioContext, resumeAudioContext } = useAudioStore();
  
  // Realtime level driven by worker (not React polling) - use ref for smooth animation
  const audioLevelRef = useRef<number>(0);
  
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recorderRef = useRef<UniversalSTTRecorder | null>(null);
  const isStartingRef = useRef(false);
  const isActiveRef = useRef(false);
  const wasSubscribedRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 🚨 RESET TO TAP TO START - ROBUST cleanup with validation
  const resetToTapToStart = useCallback(async (reason: string) => {
    
    // 1. IMMEDIATE GUARDS - Stop all operations
    isShuttingDown.current = true;
    isProcessingRef.current = false;
    isStartingRef.current = false;
    isActiveRef.current = false;
    wasSubscribedRef.current = false;
    
    // 2. DISABLE TTS MODE - Flush buffered messages back to text mode
    try {
      const { chatController } = await import('@/features/chat/ChatController');
      chatController.setTtsMode(false);
    } catch (e) {
      console.error('[ConversationOverlay] Failed to disable TTS mode:', e);
    }
    
    // Force cleanup all resources (fire-and-forget)
    ttsPlaybackService.destroy().catch(() => {});
    try { recorderRef.current?.dispose(); } catch {}
    
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

  // 🎵 AUDIOCONTEXT USER GESTURE LISTENER - Critical for Chrome
  useEffect(() => {
    if (!overlayRef.current || isAudioUnlocked) return;

    const handleUserGesture = async () => {
      // Initialize AudioContext if not exists
      const ctx = audioContext || initializeAudioContext();
      
      // Resume AudioContext
      const success = await resumeAudioContext();
      if (!success) {
        console.error('[ConversationOverlay] ❌ Failed to unlock AudioContext');
      }
    };

    // Add event listeners for user gestures
    overlayRef.current.addEventListener('click', handleUserGesture, { once: true });
    overlayRef.current.addEventListener('touchstart', handleUserGesture, { once: true });

    return () => {
      if (overlayRef.current) {
        overlayRef.current.removeEventListener('click', handleUserGesture);
        overlayRef.current.removeEventListener('touchstart', handleUserGesture);
      }
    };
  }, [audioContext, isAudioUnlocked, initializeAudioContext, resumeAudioContext]);

  // WebSocket connection setup
  const establishConnection = useCallback(async () => {
    if (!chat_id) {
      console.error('[ConversationOverlay] ❌ No chat_id available for WebSocket connection');
      return false;
    }
    
    if (connectionRef.current) {
      return true;
    }
    
    try {
      
      
      const connection = supabase.channel(`conversation:${chat_id}`);
      
      connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
        if (payload.audioBytes && !isShuttingDown.current) {
          playAudioImmediately(payload.audioBytes);
        }
      });
      
      connection.on('broadcast', { event: 'thinking-mode' }, ({ payload }) => {
        if (!isShuttingDown.current) {
          setState('thinking');
        }
      });
      
      return new Promise<boolean>((resolve, reject) => {
        let settled = false;
        wasSubscribedRef.current = false;
        
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          try { connection.unsubscribe(); } catch {}
          reject(new Error('subscribe timeout'));
        }, 8000);
        
        connection.subscribe((status) => {
          
          if (status === 'SUBSCRIBED') {
            wasSubscribedRef.current = true;
            clearTimeout(timeout);
            if (settled) return;
            settled = true;
            connectionRef.current = connection;
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            if (settled) return;
            settled = true;
            reject(new Error(status));
          } else if (status === 'CLOSED') {
            // If we never got SUBSCRIBED, treat as connect failure; don't reset UI here.
            if (!wasSubscribedRef.current) {
              clearTimeout(timeout);
              if (settled) return;
              settled = true;
              reject(new Error('closed before subscribed'));
            } else {
              // Closed after being active: only then reset.
              if (isActiveRef.current && !isShuttingDown.current) {
                resetToTapToStart('Unexpected WebSocket close');
              }
            }
          }
        });
      });
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
      // Set state to 'replying' immediately when TTS starts
      // Animation will be driven by actual audio output from TTS service
      setState('replying');
      
      await ttsPlaybackService.play(audioBytes, () => {
        setState('listening');
        
        // Resume mic for next turn
        if (!isShuttingDown.current) {
          setTimeout(() => {
            if (!isShuttingDown.current) {
              try {
                // Ensure mic input is on and immediately start a fresh recording segment
                recorderRef.current?.resumeInput();
                recorderRef.current?.startNewRecording();
              } catch {}
            }
          }, 200);
        }
      });
    } catch (error) {
      console.error('[ConversationOverlay] ❌ TTS playback failed:', error);
      resetToTapToStart('TTS playback failed');
    }
  }, []);

  // Start conversation - ROBUST SEQUENCE with validation
  const handleStart = useCallback(async () => {
    // 1. IDEMPOTENT GUARD - Prevent multiple simultaneous starts
    if (isStartingRef.current || isActiveRef.current || !chat_id) return;
    
    isStartingRef.current = true;
    setState('establishing');
    
    try {
      // 2. MIC PERMISSION PREFLIGHT - Android requires this before AudioContext
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('[ConversationOverlay] Mic permission denied:', error);
        throw new Error('Microphone permission required for conversation mode');
      }
      
      // 3. AUDIOCONTEXT UNLOCK - Ensure unlock happens within this user gesture
      const ctx = audioContext || initializeAudioContext();
      await resumeAudioContext();
      
      // 3. STEP 1: Audio Warmup with validation
      const { ttsPlaybackService } = await import('@/services/voice/TTSPlaybackService');
      // Provide shared/unlocked AudioContext to TTS service
      ttsPlaybackService.setAudioContextProvider(() => ctx);
      await ttsPlaybackService.warmup();
      
      // 4. STEP 2: WebSocket connection with validation
      const connectionEstablished = await establishConnection();
      if (!connectionEstablished) {
        throw new Error('Failed to establish TTS WebSocket connection');
      }
      
      // 5. STEP 3: Enable TTS mode with validation (pauses DB realtime)
      const { chatController } = await import('@/features/chat/ChatController');
      chatController.setTtsMode(true);
      
      // 6. STEP 4: Initialize Universal Recorder
      recorderRef.current = new UniversalSTTRecorder({
        mode: 'conversation',
        silenceHangover: 600,
        onTranscriptReady: (transcript: string) => {
          if (isShuttingDown.current || isProcessingRef.current) {
            return;
          }
          isProcessingRef.current = true;
          setState('thinking');
          // TTS will arrive over WS and change UI to "speaking" asynchronously
          isProcessingRef.current = false;
        },
        onLevel: (level) => {
          if (!isShuttingDown.current) audioLevelRef.current = level;
        },
        onError: (error: Error) => {
          console.error('[ConversationOverlay] Audio recorder error:', error);
          resetToTapToStart('Audio recorder error');
        }
      });
      
      // 7. STEP 5: Start recorder
      await recorderRef.current.start();
      
      // 8. STEP 6: Final validation - All systems ready
      if (!connectionRef.current) {
        throw new Error('TTS WebSocket connection lost during setup');
      }
      if (!recorderRef.current) {
        throw new Error('Audio recorder not initialized');
      }
      
      // 9. SUCCESS - Mark active only after everything is ready
      isActiveRef.current = true;
      hasStarted.current = true;
      setState('listening');
      
    } catch (error) {
      console.error('[ConversationOverlay] Start failed:', error);
      resetToTapToStart('Conversation start failed');
    } finally {
      isStartingRef.current = false;
    }
  }, [chat_id, establishConnection, initializeAudioContext, resumeAudioContext]);

  // Cleanup on modal close - graceful release with fire-and-forget
  const handleModalClose = useCallback(async () => {
    isShuttingDown.current = true;
    
    // IMMEDIATE audio stop - no race condition
    ttsPlaybackService.stop();
    ttsPlaybackService.destroy().catch(() => {});

    // Fire-and-forget microphone release
    try { recorderRef.current?.dispose(); } catch {}
    
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
      try { recorderRef.current?.dispose(); } catch {}
      ttsPlaybackService.destroy().catch(() => {});
    }
  }, [state]);

  // Manage mic state based on conversation UI state
  useEffect(() => {
    if (!recorderRef.current) return;

    if (state === 'listening') {
      // Resume mic input so user can speak
      try { recorderRef.current.resumeInput(); } catch {}
    } else {
      // Pause mic input during thinking/replying/connecting/establishing
      try { recorderRef.current.pauseInput(); } catch {}
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
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-white pt-safe pb-safe"
      data-conversation-overlay
    >
      <div className="h-full w-full flex items-center justify-center px-6">
        {state === 'connecting' ? (
          <div className="text-center text-gray-800 flex flex-col items-center gap-4">
            <div
              className="flex flex-col items-center gap-4 cursor-pointer"
              onClick={() => {
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