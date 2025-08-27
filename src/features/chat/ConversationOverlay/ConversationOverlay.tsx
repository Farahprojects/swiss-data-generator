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
  
  // Cache chat_id when modal opens and setup overlay realtime
  useEffect(() => {
    if (isConversationOpen && chat_id && !chatIdRef.current) {
      chatIdRef.current = chat_id;
      // Cleanup ChatController's realtime subscription and setup overlay's own
      chatController.cleanup();
      setupOverlayRealtime(chat_id);
    }
  }, [isConversationOpen, chat_id]);

  // Setup overlay-owned realtime subscription
  const setupOverlayRealtime = (chat_id: string) => {
    cleanupOverlayRealtime();
    
    try {
      overlayChannelRef.current = supabase
        .channel(`overlay-messages:${chat_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chat_id}`
          },
          (payload) => {
            const newMessage = transformDatabaseMessage(payload.new);
            const { messages, updateMessage, addMessage } = useChatStore.getState();
            
            // Reconciliation logic: check if this is updating an optimistic message
            if (newMessage.role === 'user' && newMessage.client_msg_id) {
              // Find and update the optimistic user message
              const optimisticMessage = messages.find(m => m.id === newMessage.client_msg_id);
              if (optimisticMessage) {
                updateMessage(newMessage.client_msg_id, { ...newMessage });
                return;
              }
            }
            
            // Only add if not already present and no reconciliation occurred
            if (!messages.find(m => m.id === newMessage.id)) {
              addMessage(newMessage);
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('[ConversationOverlay] Failed to setup realtime subscription:', error);
    }
  };

  const cleanupOverlayRealtime = () => {
    if (overlayChannelRef.current) {
      supabase.removeChannel(overlayChannelRef.current);
      overlayChannelRef.current = null;
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
        isShuttingDown.current = true; // Set shutdown flag
        conversationTtsService.stopAllAudio();
        conversationMicrophoneService.forceCleanup();
        cleanupOverlayRealtime();
        try {
          const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
          microphoneArbitrator.release('conversation');
        } catch (error) {
          // Silent cleanup - this is expected if already released
        }
      }
    };
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = async () => {
    // Set shutdown flag immediately to prevent any further processing
    isShuttingDown.current = true;
    
    // 1. Stop all TTS audio playback immediately
    conversationTtsService.stopAllAudio();
    
    // 2. Force cleanup of microphone service to release all streams and contexts
    conversationMicrophoneService.forceCleanup();
    
    // 3. Cleanup overlay realtime subscription
    cleanupOverlayRealtime();
    
    // 4. Release microphone arbitrator to free up browser permissions
    try {
      const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
      microphoneArbitrator.release('conversation');
    } catch (error) {
      // Silent cleanup - this is expected if already released
    }
    
    // 5. Re-initialize ChatController for normal chat functionality
    if (chatIdRef.current) {
      chatController.initializeConversation(chatIdRef.current);
    }
    
    // 6. Refresh conversation history to show new messages
    try {
      const { retryLoadMessages } = useChatStore.getState();
      await retryLoadMessages();
    } catch (error) {
      // Silent refresh failure - not critical
    }
    
    // 7. Close the UI and reset all state
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    setConversationState('listening');
    
    // 8. Clear cached chat_id
    chatIdRef.current = null;
  };

  const handleStart = () => {
    // One-shot guard to prevent double invocation
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    if (isStarting) return; // Prevent double taps
    setIsStarting(true);

    if (!chatIdRef.current) {
      console.error("[ConversationOverlay] Cannot start conversation without a chat_id");
      closeConversation();
      return;
    }

    // No need to set conversation mode - all requests now use OpenAI

    // 🔥 CRITICAL: Unlock TTS audio FIRST within user gesture
    conversationTtsService.unlockAudio();

    // Set flags for instant UI feedback - go straight to listening mode
    setPermissionGranted(true);
    
    // Start simple conversation flow - no complex hooks
    startSimpleConversation();
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
      setConversationState('processing');
      
      // Use established STT service (same as chatbar mic)
      const result = await sttService.transcribe(audioBlob, chatIdRef.current!, {}, 'conversation', sessionIdRef.current);
      const transcript = result.transcript;
      
      // Shutdown guard - check again after STT
      if (isShuttingDown.current) {
        return;
      }
      
      if (!transcript?.trim()) {
        setConversationState('listening');
        return;
      }
      
      // Use established LLM service (same as chatbar) - use proper UUID
      const client_msg_id = uuidv4();
      // Add optimistic user message to store using client_msg_id for reconciliation
      useChatStore.getState().addMessage({
        id: client_msg_id, // Use client_msg_id as id for proper reconciliation
        chat_id: chatIdRef.current!,
        role: 'user',
        text: transcript,
        createdAt: new Date().toISOString(),
        client_msg_id, // Add for reconciliation
      });
      
      // Send message - this will trigger Realtime assistant response
      await llmService.sendMessage({
        chat_id: chatIdRef.current!,
        text: transcript,
        client_msg_id
      });
      
      // DON'T restart recording here - let the Realtime effect handle it
      // This prevents the duplicate recording logic that causes MediaRecorder errors
      
    } catch (error) {
      // Only log error if not shutting down
      if (!isShuttingDown.current) {
        console.error('[ConversationOverlay] Simple processing error:', error);
        setConversationState('connecting');
      }
    }
  };

  // Watch for new assistant messages via Realtime and trigger TTS
  useEffect(() => {
    if (!permissionGranted || !chatIdRef.current) return;

    const latestMessage = messages
      .filter(m => m.chat_id === chatIdRef.current && m.role === 'assistant')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestMessage && latestMessage.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = latestMessage.id;
      
      setConversationState('replying');
      conversationTtsService.speakAssistant({
        chat_id: chatIdRef.current,
        messageId: latestMessage.id,
        text: latestMessage.text,
        sessionId: sessionIdRef.current,
        onComplete: async () => {
          // Shutdown guard - don't restart recording if modal is closing
          if (isShuttingDown.current) {
            return;
          }
          
          setConversationState('listening');
          
          // Properly restart recording after TTS completes
          try {
            // Small delay to ensure TTS is fully complete
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Shutdown guard - check again after delay
            if (isShuttingDown.current) {
              return;
            }
            
            const success = await conversationMicrophoneService.startRecording();
            if (!success) {
              console.error('[ConversationOverlay] Failed to start recording after TTS');
              setConversationState('connecting');
            }
          } catch (error) {
            // Only log error if not shutting down
            if (!isShuttingDown.current) {
              console.error('[ConversationOverlay] Error starting recording after TTS:', error);
              setConversationState('connecting');
            }
          }
        }
      });
    }
  }, [messages, permissionGranted]);


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
