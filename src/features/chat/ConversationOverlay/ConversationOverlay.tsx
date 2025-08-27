import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { chatController } from '@/features/chat/ChatController';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const messages = useChatStore((state) => state.messages);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation
  const isShuttingDown = useRef(false); // Shutdown guard to prevent processing after modal close

  // Simple conversation state
  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting'>('listening');
  
  // Cache chat_id and session ID once at start - use for entire conversation
  const chatIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // REMOVED: All realtime listeners and TTS flow

  const transformDatabaseMessage = (dbMessage: any): Message => {
    return {
      id: dbMessage.id,
      chat_id: dbMessage.chat_id,
      role: dbMessage.role,
      text: dbMessage.text,
      audioUrl: dbMessage.audio_url,
      timings: dbMessage.timings,
      createdAt: dbMessage.created_at,
      meta: dbMessage.meta,
      client_msg_id: dbMessage.client_msg_id,
      status: dbMessage.status
    };
  };

  // Cleanup on unmount to ensure all resources are released
  useEffect(() => {
    return () => {
      if (isConversationOpen) {
        try {
          isShuttingDown.current = true; // Set shutdown flag
          conversationTtsService.stopAllAudio();
          conversationMicrophoneService.forceCleanup();
          
          const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
          microphoneArbitrator.release('conversation');
          
          // Clear local messages
          setLocalMessages([]);
          
          // Clear cached chat_id and session
          chatIdRef.current = null;
          sessionIdRef.current = `session_${Date.now()}`;
          
        } catch (error) {
          console.error('[CONVERSATION-TURN] Emergency cleanup error:', error);
        }
      }
    }
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = async () => {
    isShuttingDown.current = true;
    
    conversationTtsService.stopAllAudio();
    conversationMicrophoneService.forceCleanup();
    
    try {
      const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
      microphoneArbitrator.release('conversation');
    } catch (error) {}
    
    if (chatIdRef.current) {
      chatController.initializeConversation(chatIdRef.current);
    }
    
    try {
      const { retryLoadMessages } = useChatStore.getState();
      await retryLoadMessages();
    } catch (error) {}
    
    closeConversation();
    setPermissionGranted(false);
    setIsStarting(false);
    hasStarted.current = false;
    setConversationState('listening');
    chatIdRef.current = null;
    setLocalMessages([]);
  };

  // Start conversation recording
  const handleStart = async () => {
    if (isStarting || hasStarted.current) return;
    
    setIsStarting(true);
    hasStarted.current = true;
    
    try {
      console.log('[CONVERSATION-TURN] Starting...');
      
      conversationTtsService.unlockAudio();
      conversationTtsService.suspendAudioPlayback();
      
      // Request microphone permission with error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        });
      } catch (permissionError) {
        console.error('[CONVERSATION-TURN] Microphone permission denied:', permissionError);
        setConversationState('connecting');
        return;
      }
      
      setPermissionGranted(true);
      conversationMicrophoneService.cacheStream(stream);
      
      conversationMicrophoneService.initialize({
        onRecordingComplete: handleSimpleRecordingComplete,
        onSilenceDetected: () => {
          console.log('[CONVERSATION-TURN] Silence detected, stopping recording.');
          if (conversationMicrophoneService.getState().isRecording) {
            conversationMicrophoneService.stopRecording();
          }
        },
        onError: (error) => {
          console.error('[CONVERSATION-TURN] Microphone error:', error);
          setConversationState('connecting');
        },
        silenceTimeoutMs: 2000,
      });
      
      const success = await conversationMicrophoneService.startRecording();
      if (success) {
        console.log('[CONVERSATION-TURN] Now listening for user...');
        setConversationState('listening');
      } else {
        console.error('[CONVERSATION-TURN] Failed to start recording.');
        setConversationState('connecting');
      }
      
    } catch (error) {
      console.error('[CONVERSATION-TURN] Startup error:', error);
      setConversationState('connecting');
    } finally {
      setIsStarting(false);
    }
  };

  // Simple conversation flow - nothing can mess with this
  const startSimpleConversation = async () => {
    try {
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
      
    } catch (error) {
      console.error('[ConversationOverlay] Failed to start conversation:', error);
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
    }
  };

  // Simple STT processing - using established services
  const handleSimpleRecordingComplete = async (audioBlob: Blob) => {
    // Shutdown guard - don't process if modal is closing
    if (isShuttingDown.current) {
      return;
    }

    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size < 1024) { // Less than 1KB
      console.log('[CONVERSATION-TURN] Audio blob too small, returning to listening:', audioBlob?.size || 0);
      setConversationState('listening');
      return;
    }
    
    try {
      setConversationState('processing');
      console.log('[CONVERSATION-TURN] User speech recorded, processing...');

      // Wrap STT promise with comprehensive error handling
      try {
        const result = await sttService.transcribe(audioBlob, chatIdRef.current!, {}, 'conversation', sessionIdRef.current);
        
        // Shutdown guard - check again after STT
        if (isShuttingDown.current) {
          return;
        }
        
        const transcript = result.transcript;
        
        if (!transcript?.trim()) {
          console.log('[CONVERSATION-TURN] Empty transcript, returning to listening.');
          setConversationState('listening');
          return;
        }
        
        const client_msg_id = uuidv4();
        const optimisticUserMessage: Message = {
          id: client_msg_id,
          chat_id: chatIdRef.current!,
          role: 'user',
          text: transcript,
          createdAt: new Date().toISOString(),
          client_msg_id,
        };
        setLocalMessages(prev => [...prev, optimisticUserMessage]);
        
        // Fire-and-forget LLM call with error handling
        llmService.sendMessage({
          chat_id: chatIdRef.current!,
          text: transcript,
          client_msg_id,
          mode: 'conversation',
          sessionId: sessionIdRef.current
        }).catch(error => {
          console.error('[CONVERSATION-TURN] LLM call error:', error);
          if (!isShuttingDown.current) setConversationState('listening');
        });
        
      } catch (sttError) {
        console.error('[CONVERSATION-TURN] STT error:', sttError);
        if (!isShuttingDown.current) setConversationState('listening');
      }
      
    } catch (error) {
      console.error('[CONVERSATION-TURN] Processing error:', error);
      if (!isShuttingDown.current) setConversationState('listening');
    }
  };


  // TEMPORARILY DISABLED: Confirm only Supabase listener triggers TTS
  // useEffect(() => {
  //   if (conversationState === 'processing') {
  //     // After a short delay, set to replying to show TTS is coming
  //     const timer = setTimeout(() => {
  //       if (!isShuttingDown.current) {
  //         setConversationState('replying');
  //         conversationTtsService.resumeAudioPlayback();
  //       }
  //     }, 1000);
  //     
  //     return () => clearTimeout(timer);
  //   }
  // }, [conversationState]);

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