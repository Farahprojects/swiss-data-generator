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
  const animationTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const pingIntervalRef = useRef<number | null>(null);
  
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

  // 🎵 WEB AUDIO API: Real-time analysis with AnalyserNode for authentic bars
  const playAudioImmediately = useCallback(async (audioBytes: number[], text?: string) => {
    if (isShuttingDown.current) return;
    
    try {
      // 🎯 CHECK: Ensure AudioContext is available and running
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.log('[ConversationOverlay] 🎵 AudioContext closed or missing, recreating...');
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'playback' });
        } catch (e) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      }
      
      const audioContext = audioContextRef.current;
      
      // 🎯 CHECK: Ensure AudioContext is running (resume if suspended)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // 🎯 DIRECT: Convert bytes to ArrayBuffer and decode
      const arrayBuffer = new Uint8Array(audioBytes).buffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 🎵 REAL-TIME: Create analyzer for live audio analysis
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Good resolution for 4 bars
      analyser.smoothingTimeConstant = 0.8; // Smooth the data
      
      // 🎯 DIRECT: Create source and connect to analyzer + destination
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // 🚀 PLAY AUDIO IMMEDIATELY - No waiting for anything else
      source.start(0);
      currentTtsSourceRef.current = source;
      
      // 🎯 STATE DRIVEN: Set replying state
      setState('replying');
      
      // 🔇 Suspend microphone capture during TTS playback (mutual exclusivity)
      try {
        conversationMicrophoneService.suspendForPlayback();
      } catch (e) {
        console.warn('[ConversationOverlay] Could not suspend mic for playback', e);
      }
      
      // 🌐 PAUSE: Pause WebSocket during TTS playback to prevent interference
      if (connectionRef.current && connectionRef.current.state === 'SUBSCRIBED') {
        connectionRef.current.unsubscribe();
        console.log('[ConversationOverlay] 🌐 WebSocket paused during TTS playback');
      }
      
      // 🎵 REAL-TIME: Start bars animation service for live data
      directBarsAnimationService.start();
      
      // 🎵 REAL-TIME: Live audio analysis loop (25fps for mobile performance)
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        if (isShuttingDown.current || !currentTtsSourceRef.current) {
          // 🛑 CLEANUP: Clear timeout reference when stopping
          animationTimeoutRef.current = null;
          return;
        }
        
        // Get live frequency data from the analyzer
        analyser.getByteFrequencyData(frequencyData);
        
        // 🎵 REAL-TIME: Calculate overall audio level for synchronized bars
        // Sum all frequency bins to get overall audio intensity
        let totalLevel = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          totalLevel += frequencyData[i];
        }
        const overallLevel = totalLevel / (frequencyData.length * 255); // Normalize to 0-1
        
        // 🎯 SIMPLIFIED: All bars use the same signal for synchronized movement
        const barLevels: FourBarLevels = [
          overallLevel,  // All bars move together
          overallLevel,  // All bars move together
          overallLevel,  // All bars move together
          overallLevel   // All bars move together
        ];
        
        // Send live data to bars
        directBarsAnimationService.notifyBars(barLevels);
        
        // 🛑 SECURE: Store timeout ID for proper cleanup
        animationTimeoutRef.current = window.setTimeout(animate, 40);
      };
      
      // Start the real-time animation loop
      animationTimeoutRef.current = window.setTimeout(animate, 40);
      
              // 🎯 STATE DRIVEN: Return to listening when done
        source.onended = () => {
          console.log('[ConversationOverlay] 🎵 TTS audio finished, returning to listening mode');
          
          // 🛑 CLEANUP: Cancel animation timeout to prevent CPU leak
          if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
          }
          
          // 🎵 Stop animation service when TTS ends
          directBarsAnimationService.stop();
          
          setState('listening');
         
         // 🔊 Resume microphone capture after playback ends
         try {
           conversationMicrophoneService.resumeAfterPlayback();
         } catch (e) {
           console.warn('[ConversationOverlay] Could not resume mic after playback', e);
         }
         
         // 🌐 RESUME: Resume WebSocket after TTS playback ends
         if (connectionRef.current && connectionRef.current.state === 'CLOSED') {
           connectionRef.current.subscribe();
           console.log('[ConversationOverlay] 🌐 WebSocket resumed after TTS playback');
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
      console.error('[ConversationOverlay] ❌ Web Audio API failed:', error);
      setState('listening');
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
      } catch (e) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
    
    // 🏓 PING: Resume AudioContext if suspended to keep it warm
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('[ConversationOverlay] 🎵 AudioContext pinged and resumed');
    }
    
    return audioContextRef.current;
  }, []);

  // 🎯 START: Initialize conversation with warm connections
  const handleStart = useCallback(async () => {
    if (isStarting || hasStarted.current) return;
    if (!chat_id) return;
    
    setIsStarting(true);
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
  }, [chat_id, isStarting, establishConnection, pingAudioContext]);

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
      // 🎯 STATE DRIVEN: Processing state
      setState('thinking');
      
      // Transcribe audio
      const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation', chat_id);
      const transcript = result.transcript?.trim();
      
      if (!transcript) {
        setState('listening');
        return;
      }
      
      // 🚀 OPTIMIZED: WebSocket already established at start, just ensure it's active
      console.log('[ConversationOverlay] 🚀 WebSocket already warmed up, proceeding with LLM call');
      
      // Send to chat-send via the existing working llmService (handles LLM → TTS → WebSocket automatically)
      console.log('[ConversationOverlay] 🎯 Calling llmService.sendMessage for TTS generation');
      const response = await llmService.sendMessage({
        chat_id,
        text: transcript,
        client_msg_id: uuidv4(),
        mode: 'conversation'
      });
      console.log('[ConversationOverlay] ✅ llmService.sendMessage completed');
      
      // 🎯 STATE DRIVEN: Replying state (TTS will come via WebSocket from chat-send)
      setState('replying');
      
    } catch (error) {
      console.error('[ConversationOverlay] ❌ Processing failed:', error);
      setState('listening');
    } finally {
      // 🛡️ CLEANUP: Reset processing flag
      isProcessingRef.current = false;
    }
  }, [chat_id, establishConnection, state]);

  // 🎯 CLEANUP: Master shutdown - Browser APIs FIRST, then everything else
  const handleModalClose = useCallback(async () => {
    console.log('[ConversationOverlay] 🚨 X Button pressed - Master shutdown starting');
    isShuttingDown.current = true;
    
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
      conversationMicrophoneService.cleanup();
      console.log('[ConversationOverlay] 🎤 Microphone and MediaStream released');
    } catch (e) {
      console.warn('[ConversationOverlay] Could not cleanup microphone:', e);
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
    setState('listening');
    setPermissionGranted(false);
    hasStarted.current = false;
    isShuttingDown.current = false;
    console.log('[ConversationOverlay] 🎯 UI state reset');
    
    closeConversation();
  }, [closeConversation]);

  // 🛑 CLEANUP: Handle component unmounting to prevent CPU leaks
  useEffect(() => {
    return () => {
      // Cancel any running animation timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Stop animation service
      directBarsAnimationService.stop();
      
      // Clean up audio context
      if (audioContextRef.current) {
        safelyCloseAudioContext(audioContextRef.current);
        audioContextRef.current = null;
      }
      
      // Clean up WebSocket connection
      if (connectionRef.current) {
        connectionRef.current.unsubscribe();
        connectionRef.current = null;
      }
    };
  }, []);

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