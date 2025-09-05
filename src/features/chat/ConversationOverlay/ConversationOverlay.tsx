import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useConversationRealtimeAudioLevel } from '@/hooks/useConversationRealtimeAudioLevel';
import { VoiceBubble } from './VoiceBubble';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { directBarsAnimationService, FourBarLevels } from '@/services/voice/DirectBarsAnimationService';
import { ttsPlaybackService } from '@/services/voice/TTSPlaybackService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

// 🎯 CORE STATE MACHINE: This drives everything
type ConversationState = 'listening' | 'thinking' | 'replying' | 'connecting' | 'establishing';


// 🎵 UTILITY: Safely close AudioContext with proper state checking
const safelyCloseAudioContext = (audioContext: AudioContext | null): void => {
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close();
    } catch (error) {
      console.log('[ConversationOverlay] AudioContext already closed, skipping');
    }
  }
};

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  // 🎯 PRIMARY: State machine drives everything
  const [state, setState] = useState<ConversationState>('connecting');
  
  // 🎵 REALTIME AUDIO LEVEL - Auto-attaches to microphone lifecycle
  const audioLevel = useConversationRealtimeAudioLevel({
    updateIntervalMs: 50, // 20fps for React state updates (smooth but not excessive)
    smoothingFactor: 0.8, // Smooth animations
  });
  
  
  // 🎯 ESSENTIAL: Only what we need for state transitions
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const pingIntervalRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  
  // 🎵 AUDIO: Single context for all audio
  const audioContextRef = useRef<AudioContext | null>(null);
  
  

  // 🎯 CORE STATE MACHINE: Initialize when overlay opens
  useEffect(() => {
    if (isConversationOpen && chat_id) {
      // State starts as 'connecting' to show start button
    }
    
    return () => {
      if (connectionRef.current) {
        connectionRef.current.unsubscribe();
      }
      // 🎵 ELEGANT: Use utility function for safe AudioContext cleanup
      safelyCloseAudioContext(audioContextRef.current);
    };
  }, [isConversationOpen, chat_id]);

  // 🎵 AUDIO: Initialize once, reuse for all audio
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        // Prefer playback latency to reduce power usage on mobile/desktop when playing TTS
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'playback' });
      } catch (e) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
    
    return () => {
      // 🎵 ELEGANT: Use utility function for safe AudioContext cleanup
      safelyCloseAudioContext(audioContextRef.current);
      audioContextRef.current = null;
    };
  }, []);

  // 🎵 TTS PLAYBACK: Delegated to TTSPlaybackService (owns analyser + animation)
  const playAudioImmediately = useCallback(async (audioBytes: number[], text?: string) => {
    if (isShuttingDown.current) return;
    try {
      // Set replying state
      setState('replying');

      // Mute mic during playback (simple track.enabled = false)
      try { conversationMicrophoneService.mute(); } catch {}

      // Pause WebSocket during playback
      if (connectionRef.current && connectionRef.current.state === 'SUBSCRIBED') {
        connectionRef.current.unsubscribe();
        console.log('[ConversationOverlay] 🌐 WebSocket paused during TTS playback');
      }

      await ttsPlaybackService.play(audioBytes, () => {
        console.log('[ConversationOverlay] 🎵 TTS audio finished, returning to listening mode');
        setState('listening');

        // Resume WebSocket (mic will be resumed by startRecording below)
        if (connectionRef.current && connectionRef.current.state === 'CLOSED') {
          connectionRef.current.subscribe();
          console.log('[ConversationOverlay] 🌐 WebSocket resumed after TTS playback');
        }

        // Simply unmute the microphone for next turn (no complex pause/unpause)
        if (!isShuttingDown.current) {
          setTimeout(() => {
            if (!isShuttingDown.current) {
              try {
                conversationMicrophoneService.unmute();
                console.log('[ConversationOverlay] 🎤 Microphone unmuted for next turn');
              } catch (error) {
                console.error('[ConversationOverlay] ❌ Failed to unmute microphone:', error);
              }
            }
          }, 200);
        } else {
          console.log('[ConversationOverlay] 🎤 Shutting down, skipping microphone unmute');
        }
      });
    } catch (error) {
      console.error('[ConversationOverlay] ❌ TTS playback failed:', error);
      setState('connecting');
    }
  }, []);

  // 🎯 CONNECTION: Persistent WebSocket with pause/resume and ping
  const establishConnection = useCallback(async () => {
    if (!chat_id) return false;
    
    try {
      // 🚀 OPTIMIZATION: Create WebSocket once at start, reuse for all turns
      if (!connectionRef.current) {
        const connection = supabase.channel(`conversation:${chat_id}`);
        
        // 🎯 DIRECT: WebSocket → Audio + Real-time Analysis
        connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
          if (payload.audioBytes) {
            playAudioImmediately(payload.audioBytes, payload.text);
          }
        });
        
        connection.subscribe();
        connectionRef.current = connection;
        console.log('[ConversationOverlay] 🌐 WebSocket connection established and subscribed');
      } else {
        // 🔄 RESUME: Re-subscribe if already exists but paused
        if (connectionRef.current.state === 'CLOSED') {
          connectionRef.current.subscribe();
          console.log('[ConversationOverlay] 🌐 WebSocket connection resumed');
        }
      }
      
      // 🏓 PING: Keep WebSocket warm with periodic ping
      if (!pingIntervalRef.current) {
        pingIntervalRef.current = window.setInterval(() => {
          if (connectionRef.current && connectionRef.current.state === 'SUBSCRIBED') {
            // Send a lightweight ping to keep connection alive
            connectionRef.current.send({
              type: 'broadcast',
              event: 'ping',
              payload: { timestamp: Date.now() }
            });
          }
        }, 30000); // Ping every 30 seconds
        console.log('[ConversationOverlay] 🏓 WebSocket ping interval started');
      }
      
      return true;
    } catch (error) {
      console.error('[ConversationOverlay] Connection failed:', error);
      return false;
    }
  }, [chat_id, playAudioImmediately]);

  // 🎵 AUDIO: Ping AudioContext to keep it warm
  const pingAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'playback' });
        console.log('[ConversationOverlay] 🎵 AudioContext created');
      } catch (e) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[ConversationOverlay] 🎵 AudioContext created (fallback)');
      }
    }
    
    // 🏓 PING: Resume AudioContext if suspended to keep it warm
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('[ConversationOverlay] 🎵 AudioContext pinged and resumed');
    } else {
      console.log(`[ConversationOverlay] 🎵 AudioContext pinged (state: ${audioContextRef.current.state})`);
    }
    
    return audioContextRef.current;
  }, []);

  // 🎯 START: Initialize conversation with warm connections
  const handleStart = useCallback(async () => {
    if (hasStarted.current) return;
    if (!chat_id) return;
    
    hasStarted.current = true;
    
    try {
      // 🎯 STATE DRIVEN: Get microphone
      setState('establishing');
      
      // 🚀 WARM START: Initialize WebSocket and AudioContext immediately
      console.log('[ConversationOverlay] 🚀 Warming up connections...');
      
      await establishConnection();
      await pingAudioContext();
      
      console.log('[ConversationOverlay] 🚀 Connections warmed up and ready');
      
      // 🎯 STATE DRIVEN: Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 🎯 STATE DRIVEN: Cache the stream for the microphone service
      conversationMicrophoneService.cacheStream(stream);
      
      // 🎯 STATE DRIVEN: Initialize microphone service BEFORE starting recording
      conversationMicrophoneService.initialize({
        onRecordingComplete: (audioBlob: Blob) => {
          // Process recording when callback fires (unified path like chat-bar)
          processRecording(audioBlob);
        },
        onError: (error: Error) => {
          console.error('[ConversationOverlay] Microphone error:', error);
          setState('connecting');
        },
        // 🔥 REMOVED: onSilenceDetected wiring - VAD handles this internally now
        silenceTimeoutMs: 1200,
      });
      
      // 🎯 STATE DRIVEN: Start recording AFTER initialization
      console.log('[ConversationOverlay] 🎤 Starting recording...');
      const recordingStarted = await conversationMicrophoneService.startRecording();
      console.log('[ConversationOverlay] 🎤 Recording started:', recordingStarted);
      
      if (recordingStarted) {
        setState('listening');
        console.log('[ConversationOverlay] 🎤 State set to listening, ready for voice input');
      } else {
        console.error('[ConversationOverlay] ❌ Failed to start recording');
        setState('connecting');
      }
      
    } catch (error) {
      console.error('[ConversationOverlay] Start failed:', error);
      setState('connecting');
    }
  }, [chat_id, establishConnection, pingAudioContext]);

  // 🎯 PROCESSING: Handle recording completion
  const processRecording = useCallback(async (audioBlob: Blob) => {
    if (!chat_id) {
      console.error('[ConversationOverlay] ❌ No chat_id available for processing');
      return;
    }
    
    // 🛡️ PROTECTION: Prevent duplicate processing
    if (isProcessingRef.current || state === 'thinking' || state === 'replying') {
      console.log('[ConversationOverlay] 🛡️ Already processing, ignoring duplicate call');
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      // 🎯 STATE DRIVEN: Processing state - show thinking UI immediately
      setState('thinking');
      
      // 🚀 FIRE-AND-FORGET: Start STT transcription without waiting
      console.log('[ConversationOverlay] 🚀 Starting STT transcription (fire-and-forget)');
      sttService.transcribe(audioBlob, chat_id, {}, 'conversation', chat_id)
        .then(result => {
          const transcript = result.transcript?.trim();
          
          if (!transcript) {
            console.log('[ConversationOverlay] ⚠️ Empty transcript, returning to listening');
            setState('listening');
            return;
          }
          
          console.log('[ConversationOverlay] 📝 Transcript received:', transcript);
          
          // 🚀 FIRE-AND-FORGET: Send to LLM without waiting (TTS will come via WebSocket)
          console.log('[ConversationOverlay] 🎯 Calling llmService.sendMessage for TTS generation (fire-and-forget)');
          llmService.sendMessage({
            chat_id,
            text: transcript,
            client_msg_id: uuidv4(),
            mode: 'conversation'
          }).then(() => {
            console.log('[ConversationOverlay] ✅ llmService.sendMessage completed');
            // 🎯 NOTE: Replying state will be set when WebSocket receives TTS audio
          }).catch(error => {
            console.error('[ConversationOverlay] ❌ LLM processing failed:', error);
            setState('connecting');
          });
          
          // 🎯 KEEP THINKING: Don't set replying until we have actual audio from WebSocket
        })
        .catch(error => {
          console.error('[ConversationOverlay] ❌ STT or LLM processing failed:', error);
          setState('connecting');
        });
      
      // 🎯 KEEP THINKING STATE: Don't override thinking state - let the promise chain handle state transitions
      
    } catch (error) {
      console.error('[ConversationOverlay] ❌ Processing failed:', error);
      setState('connecting');
    } finally {
      // 🛡️ CLEANUP: Reset processing flag
      isProcessingRef.current = false;
    }
  }, [chat_id, establishConnection, state]);

  // 🎯 CLEANUP: Master shutdown - Browser APIs FIRST, then everything else
  const handleModalClose = useCallback(async () => {
    console.log('[ConversationOverlay] 🚨 X Button pressed - Master shutdown starting');
    isShuttingDown.current = true;
    
    // 🎵 STEP 0.1: Kill TTS playback service (own AudioContext + animation)
    try {
      await ttsPlaybackService.destroy();
      console.log('[ConversationOverlay] 🎵 TTSPlaybackService destroyed');
    } catch (e) {
      console.warn('[ConversationOverlay] Could not destroy TTSPlaybackService:', e);
    }

    // 🛑 STEP 0: Cancel animation timeout to prevent CPU leak
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
      console.log('[ConversationOverlay] 🛑 Animation timeout cancelled');
    }
    
    // 🎵 STEP 1: Stop Web Audio API source
    if (currentTtsSourceRef.current) {
      try {
        (currentTtsSourceRef.current as AudioBufferSourceNode).stop();
        console.log('[ConversationOverlay] 🎵 Web Audio API source stopped');
      } catch (e) {
        console.warn('[ConversationOverlay] Could not stop Web Audio API source:', e);
      }
      currentTtsSourceRef.current = null;
    }
    
    // 🎵 STEP 2: Close AudioContext (browser API)
    safelyCloseAudioContext(audioContextRef.current);
    audioContextRef.current = null;
    console.log('[ConversationOverlay] 🎵 AudioContext closed');
    
    // 🎤 STEP 3: Stop microphone and release MediaStream (browser API)
    try {
      conversationMicrophoneService.stopRecording();
      // VAD cleanup is handled internally by the microphone service - no external calls needed
      console.log('[ConversationOverlay] 🎤 Microphone stopped');
    } catch (e) {
      console.warn('[ConversationOverlay] Could not stop microphone:', e);
    }
    
    // 🌐 STEP 4: Close WebSocket connection and ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
      console.log('[ConversationOverlay] 🏓 WebSocket ping interval cleared');
    }
    
    if (connectionRef.current) {
      connectionRef.current.unsubscribe();
      connectionRef.current = null;
      console.log('[ConversationOverlay] 🌐 WebSocket connection closed');
    }
    
    // 🎨 STEP 5: Stop animation service
    directBarsAnimationService.stop();
    console.log('[ConversationOverlay] 🎨 Animation service stopped');
    
    // 🎯 STEP 6: Reset UI state (after all browser APIs are closed)
    setState('connecting');
    hasStarted.current = false;
    isShuttingDown.current = false;
    console.log('[ConversationOverlay] 🎯 UI state reset');
    
    closeConversation();
  }, [closeConversation]);


  // 🎯 MICROPHONE: Service is now initialized in handleStart, no need for separate useEffect

  // 🎯 SSR GUARD
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