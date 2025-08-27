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
  const lastProcessedMessageId = useRef<string | null>(null);
  const isShuttingDown = useRef(false); // Shutdown guard to prevent processing after modal close

  // Simple conversation state
  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting'>('listening');
  
  // Cache chat_id and session ID once at start - use for entire conversation
  const chatIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  
  // Overlay-owned Realtime subscription
  const overlayChannelRef = useRef<any>(null);
  
  // 🔥 COMPLETE STORE DECOUPLING: Local message tracking for conversation mode
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Cache chat_id when modal opens and setup overlay realtime
  useEffect(() => {
    if (isConversationOpen && chat_id && !chatIdRef.current) {
      console.log('[ConversationOverlay] 🔥 MODAL OPENING - CACHING CHAT_ID:', chat_id);
      chatIdRef.current = chat_id;
      // Cleanup ChatController's realtime subscription
      console.log('[ConversationOverlay] 🔥 CLEANING UP CHATCONTROLLER BEFORE SETUP');
      chatController.cleanup();
      // 🔥 CONVERSATION MODE OPTIMIZATION: Minimal Realtime listener for TTS detection
      console.log('[ConversationOverlay] 🔥 CONVERSATION MODE: Setting up minimal Realtime for TTS detection');
      setupMinimalRealtime(chat_id);
    }
  }, [isConversationOpen, chat_id]);

  // 🔥 CONVERSATION MODE OPTIMIZATION: Minimal Realtime setup for TTS detection only
  const setupMinimalRealtime = (chat_id: string) => {
    console.log('[ConversationOverlay] 🔥 SETTING UP MINIMAL REALTIME for chat_id:', chat_id);
    cleanupMinimalRealtime();
    
    try {
      overlayChannelRef.current = supabase
        .channel(`conversation-tts:${chat_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chat_id}`
          },
          (payload) => {
            const newMessage = payload.new;
            console.log('[ConversationOverlay] 🔥 REALTIME MESSAGE RECEIVED:', newMessage);
            
            // 🔥 CONVERSATION MODE: Only process assistant messages with TTS status
            if (newMessage.role === 'assistant' && newMessage.meta?.mode === 'conversation') {
              console.log('[ConversationOverlay] 🔥 CONVERSATION MODE: TTS request detected, triggering TTS');
              
              // Set conversation state to replying
              setConversationState('replying');
              
              // Resume audio playback line for TTS
              conversationTtsService.resumeAudioPlayback();
              
              // Trigger TTS for the assistant message
              conversationTtsService.speakAssistant({
                chat_id: chatIdRef.current!,
                messageId: newMessage.id,
                text: newMessage.text,
                sessionId: sessionIdRef.current,
                onComplete: async () => {
                  console.log('[ConversationOverlay] 🔥 TTS COMPLETED (conversation mode)');
                  
                  // Shutdown guard - don't restart recording if modal is closing
                  if (isShuttingDown.current) {
                    return;
                  }
                  
                  setConversationState('listening');
                  
                  // SUSPEND AUDIO PLAYBACK LINE for microphone
                  console.log('[ConversationOverlay] 🔥 SUSPENDING AUDIO PLAYBACK LINE FOR MICROPHONE');
                  conversationTtsService.suspendAudioPlayback();
                  
                  // RESUME MICROPHONE AFTER TTS to re-arm audio lane
                  try {
                    console.log('[ConversationOverlay] 🔥 RESUMING MICROPHONE AFTER TTS PLAYBACK');
                    await conversationMicrophoneService.resumeAfterPlayback();
                    
                    // Small delay to ensure audio context is fully resumed
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Shutdown guard - check again after resume
                    if (isShuttingDown.current) {
                      return;
                    }
                    
                    console.log('[ConversationOverlay] 🔥 RESTARTING RECORDING AFTER TTS');
                    const success = await conversationMicrophoneService.startRecording();
                    if (!success) {
                      console.error('[ConversationOverlay] 🔥 FAILED TO START RECORDING AFTER TTS');
                      setConversationState('connecting');
                    } else {
                      console.log('[ConversationOverlay] 🔥 RECORDING RESTARTED SUCCESSFULLY');
                    }
                  } catch (error) {
                    // Only log error if not shutting down
                    if (!isShuttingDown.current) {
                      console.error('[ConversationOverlay] 🔥 ERROR RESUMING MICROPHONE AFTER TTS:', error);
                      setConversationState('connecting');
                    }
                  }
                }
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('[ConversationOverlay] 🔥 MINIMAL REALTIME SUBSCRIPTION STATUS:', status);
        });
      console.log('[ConversationOverlay] 🔥 MINIMAL REALTIME LISTENER SETUP COMPLETE');
    } catch (error) {
      console.error('[ConversationOverlay] 🔥 FAILED TO SETUP MINIMAL REALTIME SUBSCRIPTION:', error);
    }
  };

  const cleanupMinimalRealtime = () => {
    if (overlayChannelRef.current) {
      console.log('[ConversationOverlay] 🔥 CLEANING UP MINIMAL REALTIME LISTENER');
      supabase.removeChannel(overlayChannelRef.current);
      overlayChannelRef.current = null;
      console.log('[ConversationOverlay] 🔥 MINIMAL REALTIME LISTENER CLEANED UP');
    }
  };

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
          cleanupMinimalRealtime(); // Use minimal Realtime cleanup
          
          const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
          microphoneArbitrator.release('conversation');
          
          // Clear local messages
          setLocalMessages([]);
          
          // Clear cached chat_id and session
          chatIdRef.current = null;
          sessionIdRef.current = `session_${Date.now()}`;
          
          console.log('[ConversationOverlay] 🔥 CONVERSATION MODE: Cleanup complete');
        } catch (error) {
          console.error('[ConversationOverlay] Emergency cleanup error:', error);
        }
      }
    }
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = async () => {
    console.log('[ConversationOverlay] 🔥 MODAL CLOSING - STARTING CLEANUP PROCESS');
    // Set shutdown flag immediately to prevent any further processing
    isShuttingDown.current = true;
    
    // 1. Stop all TTS audio playback immediately
    console.log('[ConversationOverlay] 🔥 STOPPING ALL TTS AUDIO');
    conversationTtsService.stopAllAudio();
    
    // 2. Force cleanup of microphone service to release all streams and contexts
    console.log('[ConversationOverlay] 🔥 FORCE CLEANING UP MICROPHONE SERVICE');
    conversationMicrophoneService.forceCleanup();
    
    // 3. Cleanup minimal realtime subscription
    console.log('[ConversationOverlay] 🔥 CLEANING UP MINIMAL REALTIME');
    cleanupMinimalRealtime();
    
    // 4. Release microphone arbitrator to free up browser permissions
    try {
      console.log('[ConversationOverlay] 🔥 RELEASING MICROPHONE ARBITRATOR');
      const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
      microphoneArbitrator.release('conversation');
    } catch (error) {
      // Silent cleanup - this is expected if already released
    }
    
    // 5. Re-initialize ChatController for normal chat functionality
    if (chatIdRef.current) {
      console.log('[ConversationOverlay] 🔥 RE-INITIALIZING CHATCONTROLLER');
      chatController.initializeConversation(chatIdRef.current);
    }
    
    // 6. Refresh conversation history to show new messages
    try {
      console.log('[ConversationOverlay] 🔥 REFRESHING CONVERSATION HISTORY');
      const { retryLoadMessages } = useChatStore.getState();
      await retryLoadMessages();
    } catch (error) {
      // Silent refresh failure - not critical
    }
    
    // 7. Close the UI and reset all state
    console.log('[ConversationOverlay] 🔥 CLOSING UI AND RESETTING STATE');
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    setConversationState('listening');
    
    // 8. Clear cached chat_id and local messages
    chatIdRef.current = null;
    setLocalMessages([]); // 🔥 COMPLETE STORE DECOUPLING: Clear local messages
    console.log('[ConversationOverlay] 🔥 MODAL CLOSE COMPLETE - ALL RESOURCES CLEANED UP');
  };

  // Start conversation recording
  const handleStart = async () => {
    if (isStarting || hasStarted.current) return;
    
    setIsStarting(true);
    hasStarted.current = true;
    
    try {
      console.log('[ConversationOverlay] 🔥 STARTING CONVERSATION MODE');
      
      // 🔥 CRITICAL: Unlock TTS audio FIRST within user gesture (iOS compatibility)
      conversationTtsService.unlockAudio();
      
      // SUSPEND AUDIO PLAYBACK LINE before starting microphone
      console.log('[ConversationOverlay] 🔥 SUSPENDING AUDIO PLAYBACK LINE FOR MICROPHONE');
      conversationTtsService.suspendAudioPlayback();
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });
      
      console.log('[ConversationOverlay] 🔥 MICROPHONE PERMISSION GRANTED');
      setPermissionGranted(true);
      
      // Cache the stream for session reuse
      conversationMicrophoneService.cacheStream(stream);
      
      // Initialize conversation microphone with options
      conversationMicrophoneService.initialize({
        onRecordingComplete: handleSimpleRecordingComplete,
        onError: (error) => {
          console.error('[ConversationOverlay] 🔥 MICROPHONE ERROR:', error);
          setConversationState('connecting');
        },
        silenceTimeoutMs: 2000, // 2 seconds for natural conversation pauses
      });
      
      // Start recording
      const success = await conversationMicrophoneService.startRecording();
      if (success) {
        console.log('[ConversationOverlay] 🔥 RECORDING STARTED SUCCESSFULLY');
        setConversationState('listening');
      } else {
        console.error('[ConversationOverlay] 🔥 FAILED TO START RECORDING');
        setConversationState('connecting');
      }
      
    } catch (error) {
      console.error('[ConversationOverlay] 🔥 STARTUP ERROR:', error);
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
    
    try {
      console.log('[ConversationOverlay] 🔥 STARTING STT PROCESSING - blob size:', audioBlob.size);
      const sttStartTime = Date.now();
      setConversationState('processing');
      
      // 🔥 FIRE-AND-FORGET: STT call - don't wait for result
      console.log('[ConversationOverlay] 🔥 CALLING STT SERVICE (fire-and-forget)...');
      sttService.transcribe(audioBlob, chatIdRef.current!, {}, 'conversation', sessionIdRef.current)
        .then(result => {
          const sttEndTime = Date.now();
          console.log('[ConversationOverlay] 🔥 STT COMPLETED in', sttEndTime - sttStartTime, 'ms');
          console.log('[ConversationOverlay] 🔥 STT RESULT:', result);
          
          const transcript = result.transcript;
          
          // Shutdown guard - check again after STT
          if (isShuttingDown.current) {
            return;
          }
          
          if (!transcript?.trim()) {
            console.log('[ConversationOverlay] 🔥 EMPTY TRANSCRIPT - RETURNING TO LISTENING');
            setConversationState('listening');
            return;
          }
          
          console.log('[ConversationOverlay] 🔥 TRANSCRIPT RECEIVED:', transcript);
          
          // Use established LLM service (same as chatbar) - use proper UUID
          const client_msg_id = uuidv4();
          console.log('[ConversationOverlay] 🔥 GENERATED CLIENT_MSG_ID:', client_msg_id);
          
          // 🔥 COMPLETE STORE DECOUPLING: Add optimistic user message locally instead of to store
          console.log('[ConversationOverlay] 🔥 ADDING OPTIMISTIC USER MESSAGE LOCALLY');
          const optimisticUserMessage: Message = {
            id: client_msg_id, // Use client_msg_id as id for proper reconciliation
            chat_id: chatIdRef.current!,
            role: 'user',
            text: transcript,
            createdAt: new Date().toISOString(),
            client_msg_id, // Add for reconciliation
          };
          setLocalMessages(prev => [...prev, optimisticUserMessage]);
          
          // 🔥 FIRE-AND-FORGET: LLM call - don't wait for response
          console.log('[ConversationOverlay] 🔥 CALLING LLM SERVICE (fire-and-forget)...');
          const llmStartTime = Date.now();
          llmService.sendMessage({
            chat_id: chatIdRef.current!,
            text: transcript,
            client_msg_id,
            mode: 'conversation', // 🔥 CONVERSATION MODE: Flag for direct TTS trigger
            sessionId: sessionIdRef.current // 🔥 CONVERSATION MODE: Session ID for TTS
          }).then(() => {
            const llmEndTime = Date.now();
            console.log('[ConversationOverlay] 🔥 LLM CALL COMPLETED in', llmEndTime - llmStartTime, 'ms');
            console.log('[ConversationOverlay] 🔥 TOTAL PROCESSING TIME:', llmEndTime - sttStartTime, 'ms');
          }).catch(error => {
            console.error('[ConversationOverlay] 🔥 LLM CALL ERROR:', error);
          });
          
          // DON'T restart recording here - let the Realtime effect handle it
          // This prevents the duplicate recording logic that causes MediaRecorder errors
          
        })
        .catch(error => {
          console.error('[ConversationOverlay] 🔥 STT ERROR:', error);
          if (!isShuttingDown.current) {
            setConversationState('connecting');
          }
        });
      
    } catch (error) {
      // Only log error if not shutting down
      if (!isShuttingDown.current) {
        console.error('[ConversationOverlay] 🔥 PROCESSING ERROR:', error);
        setConversationState('connecting');
      }
    }
  };

  // 🔥 CONVERSATION MODE OPTIMIZATION: No TTS useEffect needed - direct LLM → TTS
  // The LLM handler now directly triggers TTS, so we don't need to watch for new messages
  // console.log('[ConversationOverlay] 🔥 CONVERSATION MODE: TTS triggered directly by LLM handler');

  // 🔥 CONVERSATION MODE OPTIMIZATION: TTS completion listener for direct LLM → TTS flow
  useEffect(() => {
    if (!permissionGranted || !chatIdRef.current) return;

    // Listen for TTS completion events
    const handleTtsComplete = async () => {
      console.log('[ConversationOverlay] 🔥 TTS COMPLETED (direct LLM → TTS flow)');
      
      // Shutdown guard - don't restart recording if modal is closing
      if (isShuttingDown.current) {
        return;
      }
      
      setConversationState('listening');
      
      // SUSPEND AUDIO PLAYBACK LINE for microphone
      console.log('[ConversationOverlay] 🔥 SUSPENDING AUDIO PLAYBACK LINE FOR MICROPHONE');
      conversationTtsService.suspendAudioPlayback();
      
      // RESUME MICROPHONE AFTER TTS to re-arm audio lane
      try {
        console.log('[ConversationOverlay] 🔥 RESUMING MICROPHONE AFTER TTS PLAYBACK');
        await conversationMicrophoneService.resumeAfterPlayback();
        
        // Small delay to ensure audio context is fully resumed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Shutdown guard - check again after resume
        if (isShuttingDown.current) {
          return;
        }
        
        console.log('[ConversationOverlay] 🔥 RESTARTING RECORDING AFTER TTS');
        const success = await conversationMicrophoneService.startRecording();
        if (!success) {
          console.error('[ConversationOverlay] 🔥 FAILED TO START RECORDING AFTER TTS');
          setConversationState('connecting');
        } else {
          console.log('[ConversationOverlay] 🔥 RECORDING RESTARTED SUCCESSFULLY');
        }
      } catch (error) {
        // Only log error if not shutting down
        if (!isShuttingDown.current) {
          console.error('[ConversationOverlay] 🔥 ERROR RESUMING MICROPHONE AFTER TTS:', error);
          setConversationState('connecting');
        }
      }
    };

    // Subscribe to TTS completion events
    const unsubscribe = conversationTtsService.subscribe(handleTtsComplete);
    
    return () => {
      unsubscribe();
    };
  }, [permissionGranted, chatIdRef.current]);

  // 🔥 CONVERSATION MODE OPTIMIZATION: Set replying state when LLM processing starts
  useEffect(() => {
    if (conversationState === 'processing') {
      // After a short delay, set to replying to show TTS is coming
      const timer = setTimeout(() => {
        if (!isShuttingDown.current) {
          console.log('[ConversationOverlay] 🔥 CONVERSATION MODE: Setting replying state for direct TTS');
          setConversationState('replying');
          
          // Resume audio playback line for TTS
          conversationTtsService.resumeAudioPlayback();
        }
      }, 1000); // 1 second delay to show processing state
      
      return () => clearTimeout(timer);
    }
  }, [conversationState]);

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
