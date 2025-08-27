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
  const audioLevel = useConversationAudioLevel();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const hasStarted = useRef(false);
  const isShuttingDown = useRef(false);

  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting'>('listening');
  
  const chatIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  
  const overlayChannelRef = useRef<any>(null);
  
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    if (isConversationOpen && chat_id && !chatIdRef.current) {
      chatIdRef.current = chat_id;
      chatController.cleanup();
      setupMinimalRealtime(chat_id);
    }
  }, [isConversationOpen, chat_id]);

  const setupMinimalRealtime = (chat_id: string) => {
    cleanupMinimalRealtime();
    
    try {
      overlayChannelRef.current = supabase
        .channel(`conversation-tts:${chat_id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat_id}` },
          (payload) => {
            const newMessage = payload.new;
            
            if (newMessage.role === 'assistant' && newMessage.meta?.mode === 'conversation') {
              console.log('[CONVERSATION-TURN] Assistant message received, starting TTS.');
              setConversationState('replying');
              conversationTtsService.resumeAudioPlayback();
              
              conversationTtsService.speakAssistant({
                chat_id: chatIdRef.current!,
                messageId: newMessage.id,
                text: newMessage.text,
                sessionId: sessionIdRef.current,
                onComplete: async () => {
                  if (isShuttingDown.current) return;

                  console.log('[CONVERSATION-TURN] Assistant finished speaking.');
                  setConversationState('listening');
                  conversationTtsService.suspendAudioPlayback();
                  
                  try {
                    await conversationMicrophoneService.resumeAfterPlayback();
                    
                    console.log('[CONVERSATION-TURN] Microphone resumed, restarting recording...');
                    const success = await conversationMicrophoneService.startRecording();
                    if (success) {
                      console.log('[CONVERSATION-TURN] Now listening for user...');
                    } else {
                       console.error('[CONVERSATION-TURN] Failed to restart recording.');
                       setConversationState('listening');
                    }
                  } catch (error) {
                    if (!isShuttingDown.current) {
                      console.error('[CONVERSATION-TURN] Error resuming microphone:', error);
                      setConversationState('listening');
                    }
                  }
                }
              });
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('[CONVERSATION-TURN] Failed to setup realtime listener:', error);
    }
  };

  const cleanupMinimalRealtime = () => {
    if (overlayChannelRef.current) {
      supabase.removeChannel(overlayChannelRef.current);
      overlayChannelRef.current = null;
    }
  };
  
  useEffect(() => {
    return () => {
      if (isConversationOpen) {
        try {
          isShuttingDown.current = true;
          conversationTtsService.stopAllAudio();
          conversationMicrophoneService.forceCleanup();
          cleanupMinimalRealtime();
          const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
          microphoneArbitrator.release('conversation');
        } catch (error) {
          console.error('[CONVERSATION-TURN] Emergency cleanup error:', error);
        }
      }
    }
  }, [isConversationOpen]);

  const handleModalClose = async () => {
    isShuttingDown.current = true;
    
    conversationTtsService.stopAllAudio();
    conversationMicrophoneService.forceCleanup();
    cleanupMinimalRealtime();
    
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

  const handleStart = async () => {
    if (isStarting || hasStarted.current) return;
    
    setIsStarting(true);
    hasStarted.current = true;
    
    try {
      console.log('[CONVERSATION-TURN] Starting...');
      
      conversationTtsService.unlockAudio();
      conversationTtsService.suspendAudioPlayback();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
      });
      
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

  const handleSimpleRecordingComplete = async (audioBlob: Blob) => {
    if (isShuttingDown.current) return;
    
    if (!audioBlob || audioBlob.size === 0) {
      console.log('[CONVERSATION-TURN] Empty audio blob, returning to listening.');
      setConversationState('listening');
      return;
    }
    
    try {
      setConversationState('processing');
      console.log('[CONVERSATION-TURN] User speech recorded, processing...');

      sttService.transcribe(audioBlob, chatIdRef.current!, {}, 'conversation', sessionIdRef.current)
        .then(result => {
          if (isShuttingDown.current) return;
          
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
        })
        .catch(error => {
          console.error('[CONVERSATION-TURN] STT error:', error);
          if (!isShuttingDown.current) setConversationState('listening');
        });
      
    } catch (error) {
      if (!isShuttingDown.current) {
        console.error('[CONVERSATION-TURN] Processing error:', error);
        setConversationState('listening');
      }
    }
  };

  useEffect(() => {
    if (conversationState === 'processing') {
      const timer = setTimeout(() => {
        if (!isShuttingDown.current) {
          setConversationState('replying');
          conversationTtsService.resumeAudioPlayback();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [conversationState]);

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
