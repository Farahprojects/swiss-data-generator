import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { VoiceBubble } from './VoiceBubble';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';
import { EnvelopePlayer } from '@/services/voice/EnvelopePlayer';
import { EnvelopeGenerator } from '@/services/voice/EnvelopeGenerator';
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
  
  // 🎵 ENVELOPE: Player for smooth, synced animation
  const envelopePlayerRef = useRef<EnvelopePlayer | null>(null);
  
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
      // 🎵 Envelope-driven animation - no analyser needed
    }
    
    return () => {
      // 🎵 ELEGANT: Use utility function for safe AudioContext cleanup
      safelyCloseAudioContext(audioContextRef.current);
      audioContextRef.current = null;
      // 🎵 Envelope-driven animation - no analyser cleanup needed
    };
  }, []);

  // 🎯 DIRECT AUDIO: WebSocket → Browser Audio + Envelope for smooth bars
  const playAudioImmediately = useCallback(async (audioBytes: number[], text?: string, envelope?: number[], frameDurationMs?: number) => {
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
        // 🎵 Envelope-driven animation - no analyser needed
      }
      
      const audioContext = audioContextRef.current;
      
      // 🎯 CHECK: Ensure AudioContext is running (resume if suspended)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // 🎯 DIRECT: Convert bytes/base64 to ArrayBuffer and decode
      let arrayBuffer: ArrayBuffer;
      if (Array.isArray(audioBytes)) {
        arrayBuffer = new Uint8Array(audioBytes).buffer;
      } else {
        // If payload is base64 string, decode
        const binary = atob(audioBytes as unknown as string);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        arrayBuffer = bytes.buffer;
      }
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 🎯 DIRECT: Create source and play (no analyser needed for envelope-driven animation)
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // 🔇 Suspend microphone capture during TTS playback (mutual exclusivity)
      try {
        conversationMicrophoneService.suspendForPlayback();
      } catch (e) {
        console.warn('[ConversationOverlay] Could not suspend mic for playback', e);
      }
      
      // 🎵 ENVELOPE-DRIVEN: Start animation service
      directAudioAnimationService.start();
      
      // 🎯 NEW: Use EnvelopePlayer for progressive, mobile-friendly animation
      if (envelopePlayerRef.current) {
        envelopePlayerRef.current.stop();
      }
      
      envelopePlayerRef.current = new EnvelopePlayer(
        audioBuffer.duration * 1000, // Convert to milliseconds
        frameDurationMs && frameDurationMs > 0 ? frameDurationMs : 20,
        (level) => {
          if (!isShuttingDown.current) {
            // 🎯 DIRECT: Update the audio level for the speaking bars
            directAudioAnimationService.notifyAudioLevel(level);
          }
        }
      );
      
      // 🎯 STATE DRIVEN: Set replying state FIRST
      setState('replying');
      
      // 🚀 START AUDIO IMMEDIATELY: No waiting for envelope analysis
      source.start(0);
      currentTtsSourceRef.current = source;
      
      // 🎵 EDGE-FIRST: Use precomputed envelope from backend (no frontend processing!)
      if (Array.isArray(envelope) && envelope.length > 0) {
        console.log(`[ConversationOverlay] 🚀 Using precomputed envelope: ${envelope.length} frames`);
        
        // Start with first envelope value for instant animation
        const previewLevelNumber = Number(envelope[0]);
        const previewLevel = Number.isFinite(previewLevelNumber) ? previewLevelNumber : 0.1;
        envelopePlayerRef.current.startWithPreview(previewLevel);
        
        // Set full precomputed envelope immediately
        envelopePlayerRef.current.setFullEnvelope(envelope as number[]);
      } else if (typeof envelope === 'string' && envelope.length > 0) {
        // Handle base64 8-bit quantized envelope
        const base64 = envelope;
        const bin = atob(base64);
        const q = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) q[i] = bin.charCodeAt(i);
        const dequantized: number[] = Array.from(q, (v) => v / 255);
        console.log(`[ConversationOverlay] 🚀 Using dequantized envelope: ${dequantized.length} frames`);
        const previewLevelNum = Number(dequantized[0]);
        const previewLevel = Number.isFinite(previewLevelNum) ? previewLevelNum : 0.1;
        envelopePlayerRef.current.startWithPreview(previewLevel);
        envelopePlayerRef.current.setFullEnvelope(dequantized);
      } else {
        console.warn('[ConversationOverlay] ⚠️ No precomputed envelope received from backend');
        // Fallback to minimal animation
        envelopePlayerRef.current.startWithPreview(0.1);
      }
      
             // 🎯 STATE DRIVEN: Return to listening when done
       source.onended = () => {
         console.log('[ConversationOverlay] 🎵 TTS audio finished, returning to listening mode');
         
          // 🎵 Stop animation service when TTS ends
          directAudioAnimationService.stop();
         
         // 🎯 NEW: Stop envelope player when audio ends
         if (envelopePlayerRef.current) {
           envelopePlayerRef.current.stop();
         }
         
         conversationTtsService.setAudioLevelForAnimation(0);
         setState('listening');
         
         // 🔊 Resume microphone capture after playback ends
         try {
           conversationMicrophoneService.resumeAfterPlayback();
         } catch (e) {
           console.warn('[ConversationOverlay] Could not resume mic after playback', e);
         }
         
         // 🚨 CHECK: Only restart microphone if we're not shutting down
         if (!isShuttingDown.current) {
           // 🎤 Restart microphone recording for next turn
           try {
             conversationMicrophoneService.startRecording();
             console.log('[ConversationOverlay] 🎤 Microphone recording restarted for next turn');
           } catch (error) {
             console.error('[ConversationOverlay] ❌ Failed to restart microphone recording:', error);
           }
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
      
      // 🎯 DIRECT: WebSocket → Audio + Envelope
      connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
        const audioData = payload.audioBase64 ?? payload.audioBytes;
        const envData = payload.envelopeBase64 ?? payload.envelope;
        if (audioData) {
          playAudioImmediately(audioData, payload.text, envData, payload.frameDurationMs);
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

  // 🎯 CLEANUP: Reset everything
  const handleModalClose = useCallback(async () => {
    isShuttingDown.current = true;
    
    // Stop audio
    if (currentTtsSourceRef.current) {
      currentTtsSourceRef.current.stop();
      currentTtsSourceRef.current = null;
    }
    
    // Close connection
    if (connectionRef.current) {
      connectionRef.current.unsubscribe();
      connectionRef.current = null;
    }
    
     // 🚀 Stop animation service
     directAudioAnimationService.stop();
     
     // 🎯 NEW: Stop envelope player when modal closes
     if (envelopePlayerRef.current) {
       envelopePlayerRef.current.stop();
     }
    
    // Stop microphone and release all resources
    conversationMicrophoneService.stopRecording();
    conversationMicrophoneService.cleanup();
    
    // 🎯 STATE DRIVEN: Reset to listening
    setState('listening');
    setPermissionGranted(false);
    hasStarted.current = false;
    isShuttingDown.current = false;
    
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