import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { VoiceBubble } from './VoiceBubble';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { directBarsAnimationService, FourBarLevels } from '@/services/voice/DirectBarsAnimationService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// 🎯 CORE STATE MACHINE: This drives everything
type ConversationState = 'listening' | 'thinking' | 'replying' | 'connecting' | 'establishing';

// 🎯 SIMPLIFIED: Only what we need for state transitions
type Message = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  client_msg_id: string;
};

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
  const [state, setState] = useState<ConversationState>('listening');
  const audioLevel = useConversationAudioLevel(state !== 'replying');
  
  // 🎯 PRIMARY: State machine drives everything
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // 🎯 ESSENTIAL: Only what we need for state transitions
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // 🎵 AUDIO: Single context for all audio
  const audioContextRef = useRef<AudioContext | null>(null);
  
  
  // 🎯 STATE-DRIVEN: Local messages follow state changes
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // 🎯 CORE STATE MACHINE: Initialize when overlay opens
  useEffect(() => {
    if (isConversationOpen && chat_id) {
      setState('listening');
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

  // 🚀 INSTANT: HTML5 Audio → No Decoding, No Heavy Processing
  const playAudioImmediately = useCallback(async (audioBytes: number[], text?: string) => {
    if (isShuttingDown.current) return;
    
    try {
      // 🚀 NO AUDIOCONTEXT NEEDED - HTML5 Audio handles everything
      
      // 🚀 INSTANT: Create blob URL and play with HTML5 audio (no decoding!)
      const audioBlob = new Blob([new Uint8Array(audioBytes)], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // 🎯 DIRECT: Create HTML5 audio element for instant playback
      const audio = new Audio(audioUrl);
      currentTtsSourceRef.current = audio; // Store reference for cleanup
      
      // 🚀 PLAY AUDIO IMMEDIATELY - No waiting for anything else
      audio.play();
      
      // 🎯 STATE DRIVEN: Set replying state
      setState('replying');
      
      // 🔇 Suspend microphone capture during TTS playback (mutual exclusivity)
      try {
        conversationMicrophoneService.suspendForPlayback();
      } catch (e) {
        console.warn('[ConversationOverlay] Could not suspend mic for playback', e);
      }
      
      // 🎵 SIMPLE: Start bars animation service with simple animation
      directBarsAnimationService.start();
      
      // 🎵 SIMPLE: Basic animation loop (no heavy audio analysis)
      const animate = () => {
        if (isShuttingDown.current || !currentTtsSourceRef.current) return;
        
        // Simple pulsing animation while audio is playing
        const time = Date.now() * 0.005; // Slow animation
        const level = Math.abs(Math.sin(time)) * 0.6 + 0.4; // 0.4 to 1.0 range
        
        // All bars move together from center outward with same intensity
        const barLevels: FourBarLevels = [level, level, level, level];
        
        // Send simple data to bars
        directBarsAnimationService.notifyBars(barLevels);
        
        // 25fps = 40ms intervals for mobile performance
        setTimeout(animate, 40);
      };
      
      // Start the simple animation loop
      setTimeout(animate, 40);
      
      // 🎯 STATE DRIVEN: Return to listening when done
      audio.onended = () => {
        console.log('[ConversationOverlay] 🎵 TTS audio finished, returning to listening mode');
        
        // 🎵 Stop animation service when TTS ends
        directBarsAnimationService.stop();
        
        // 🧹 Cleanup blob URL
        URL.revokeObjectURL(audioUrl);
        
        setState('listening');
         
         // 🔊 Resume microphone capture after playback ends
         try {
           conversationMicrophoneService.resumeAfterPlayback();
         } catch (e) {
           console.warn('[ConversationOverlay] Could not resume mic after playback', e);
         }
         
         // 🚨 CHECK: Only restart microphone if we're not shutting down
         if (!isShuttingDown.current) {
           // 🎤 Restart microphone recording with timing buffer to align VAD with TTS end
           setTimeout(() => {
             if (!isShuttingDown.current) {
               try {
                 conversationMicrophoneService.startRecording();
                 console.log('[ConversationOverlay] 🎤 Microphone recording restarted for next turn (with timing buffer)');
               } catch (error) {
                 console.error('[ConversationOverlay] ❌ Failed to restart microphone recording:', error);
               }
             }
           }, 100); // 100ms buffer to align VAD with TTS timing
         } else {
           // 🚫 Shutting down - no auto-restart
           console.log('[ConversationOverlay] 🎤 Shutting down, skipping microphone restart');
         }
       };
      

      
    } catch (error) {
      console.error('[ConversationOverlay] ❌ Direct audio failed:', error);
      setState('listening');
    }
  }, []);

  // 🎯 CONNECTION: Simple WebSocket setup
  const establishConnection = useCallback(async () => {
    if (!chat_id) return false;
    
    try {
      const connection = supabase.channel(`conversation:${chat_id}`);
      
      // 🎯 DIRECT: WebSocket → Audio + Real-time Analysis
      connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
        if (payload.audioBytes) {
          playAudioImmediately(payload.audioBytes, payload.text);
        }
      });
      
      connection.subscribe();
      connectionRef.current = connection;
      return true;
    } catch (error) {
      console.error('[ConversationOverlay] Connection failed:', error);
      return false;
    }
  }, [chat_id, playAudioImmediately]);

  // 🎯 START: Initialize conversation
  const handleStart = useCallback(async () => {
    if (isStarting || hasStarted.current) return;
    if (!chat_id) return;
    
    setIsStarting(true);
    hasStarted.current = true;
    
    try {
      // 🎯 STATE DRIVEN: Establish connection
      setState('establishing');
      const success = await establishConnection();
      if (!success) {
        setState('connecting');
        return;
      }
      
      // 🎯 STATE DRIVEN: Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      
      // 🎯 STATE DRIVEN: Cache the stream for the microphone service
      conversationMicrophoneService.cacheStream(stream);
      
      // 🎯 STATE DRIVEN: Initialize microphone service BEFORE starting recording
      conversationMicrophoneService.initialize({
        onRecordingComplete: (audioBlob: Blob) => {
          // Process recording when callback fires
          processRecording(audioBlob);
        },
        onError: (error: Error) => {
          console.error('[ConversationOverlay] Microphone error:', error);
          setState('connecting');
        },
        onSilenceDetected: () => {
          conversationMicrophoneService.stopRecording();
        },
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
    } finally {
      setIsStarting(false);
    }
  }, [chat_id, isStarting, establishConnection]);

  // 🎯 PROCESSING: Handle recording completion
  const processRecording = useCallback(async (audioBlob: Blob) => {
    if (!chat_id) {
      console.error('[ConversationOverlay] ❌ No chat_id available for processing');
      return;
    }
    
    try {
      // 🎯 STATE DRIVEN: Processing state
      setState('thinking');
      
      // Transcribe audio
      const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation', chat_id);
      const transcript = result.transcript?.trim();
      
      if (!transcript) {
        setState('listening');
        return;
      }
      
      // Send to chat-send via the existing working llmService (handles LLM → TTS → WebSocket automatically)
      const response = await llmService.sendMessage({
        chat_id,
        text: transcript,
        client_msg_id: uuidv4(),
        mode: 'conversation'
      });
      
      // 🎯 STATE DRIVEN: Replying state (TTS will come via WebSocket from chat-send)
      setState('replying');
      
    } catch (error) {
      console.error('[ConversationOverlay] ❌ Processing failed:', error);
      setState('listening');
    }
  }, [chat_id]);

  // 🎯 CLEANUP: Master shutdown - Browser APIs FIRST, then everything else
  const handleModalClose = useCallback(async () => {
    console.log('[ConversationOverlay] 🚨 X Button pressed - Master shutdown starting');
    isShuttingDown.current = true;
    
    // 🎵 STEP 1: Stop HTML5 Audio (correct method)
    if (currentTtsSourceRef.current) {
      try {
        (currentTtsSourceRef.current as HTMLAudioElement).pause();
        (currentTtsSourceRef.current as HTMLAudioElement).currentTime = 0;
        console.log('[ConversationOverlay] 🎵 HTML5 Audio stopped');
      } catch (e) {
        console.warn('[ConversationOverlay] Could not stop HTML5 Audio:', e);
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
      conversationMicrophoneService.cleanup();
      console.log('[ConversationOverlay] 🎤 Microphone and MediaStream released');
    } catch (e) {
      console.warn('[ConversationOverlay] Could not cleanup microphone:', e);
    }
    
    // 🌐 STEP 4: Close WebSocket connection
    if (connectionRef.current) {
      connectionRef.current.unsubscribe();
      connectionRef.current = null;
      console.log('[ConversationOverlay] 🌐 WebSocket connection closed');
    }
    
    // 🎨 STEP 5: Stop animation service
    directBarsAnimationService.stop();
    console.log('[ConversationOverlay] 🎨 Animation service stopped');
    
    // 🎯 STEP 6: Reset UI state (after all browser APIs are closed)
    setState('listening');
    setPermissionGranted(false);
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
        {!permissionGranted ? (
          <div className="text-center text-gray-800 flex flex-col items-center gap-4">
            <div
              className="cursor-pointer flex flex-col items-center gap-4"
              onClick={handleStart}
            >
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
                <Mic className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-light">Tap to Start Conversation</h2>
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
                 : 'Replying…'}
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