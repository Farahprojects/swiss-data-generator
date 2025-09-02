import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { VoiceBubble } from './VoiceBubble';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { conversationTtsService } from '@/services/voice/conversationTts';
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

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel();
  
  // 🎯 PRIMARY: State machine drives everything
  const [state, setState] = useState<ConversationState>('listening');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // 🎯 ESSENTIAL: Only what we need for state transitions
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);
  const connectionRef = useRef<any>(null);
  const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // 🎵 AUDIO: Single context for all audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isConversationOpen, chat_id]);

  // 🎵 AUDIO: Initialize once, reuse for all audio
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      }
    };
  }, []);

  // 🎯 DIRECT AUDIO: WebSocket → Browser Audio in one function
  const playAudioImmediately = useCallback(async (audioBytes: number[], text?: string) => {
    if (isShuttingDown.current) return;
    
    try {
             if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
         analyserRef.current = audioContextRef.current.createAnalyser();
         analyserRef.current.fftSize = 256;
       }
      
      const audioContext = audioContextRef.current;
      const analyser = analyserRef.current!;
      
      // 🎯 DIRECT: Convert bytes to ArrayBuffer and decode
      const arrayBuffer = new Uint8Array(audioBytes).buffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 🎯 DIRECT: Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
             // 🎯 STATE DRIVEN: Set replying state
       setState('replying');
      source.start(0);
      currentTtsSourceRef.current = source;
      
      // 🎯 STATE DRIVEN: Return to listening when done
      source.onended = () => {
        conversationTtsService.setAudioLevelForAnimation(0);
        setState('listening');
      };
      
      // 🎯 ANIMATION: Speaking bars follow state
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animateSpeaking = () => {
        if (isShuttingDown.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        conversationTtsService.setAudioLevelForAnimation(average / 255);
        requestAnimationFrame(animateSpeaking);
      };
      animateSpeaking();
      
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
      
      // 🎯 DIRECT: WebSocket → Audio
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
      
      // 🎯 STATE DRIVEN: Start recording
      await conversationMicrophoneService.startRecording();
      setState('listening');
      
    } catch (error) {
      console.error('[ConversationOverlay] Start failed:', error);
      setState('connecting');
    } finally {
      setIsStarting(false);
    }
  }, [chat_id, isStarting, establishConnection]);

  // 🎯 PROCESSING: Handle recording completion
  const processRecording = useCallback(async (audioBlob: Blob) => {
    if (!chat_id) return;
    
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
      
      // Send to LLM
      const response = await llmService.sendMessage({
        chat_id,
        text: transcript,
        client_msg_id: uuidv4(),
        mode: 'conversation',
      });
      
             // 🎯 STATE DRIVEN: Replying state (TTS will come via WebSocket)
       if (response.text) {
         setState('replying');
       }
      
    } catch (error) {
      console.error('[ConversationOverlay] Processing failed:', error);
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
    
    // Stop microphone
    conversationMicrophoneService.stopRecording();
    
    // 🎯 STATE DRIVEN: Reset to listening
    setState('listening');
    setPermissionGranted(false);
    hasStarted.current = false;
    isShuttingDown.current = false;
    
    closeConversation();
  }, [closeConversation]);

  // 🎯 MICROPHONE: Initialize with state-driven callbacks
  useEffect(() => {
    if (!permissionGranted || state !== 'listening') return;
    
    conversationMicrophoneService.initialize({
      onRecordingComplete: (audioBlob: Blob) => {
        if (state === 'listening') {
          processRecording(audioBlob);
        }
      },
      onError: (error: Error) => {
        console.error('[ConversationOverlay] Microphone error:', error);
        setState('connecting');
      },
      silenceTimeoutMs: 1200,
    });
    
    conversationMicrophoneService.startRecording();
  }, [permissionGranted, state, processRecording]);

  // 🎯 SSR GUARD
  if (!isConversationOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
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