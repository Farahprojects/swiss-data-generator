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

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const messages = useChatStore((state) => state.messages);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation
  const lastProcessedMessageId = useRef<string | null>(null);

  // Simple conversation state
  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting'>('listening');
  
  // Load session ID once at start - use for entire conversation
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  
  // Cleanup on unmount to ensure all resources are released
  useEffect(() => {
    return () => {
      if (isConversationOpen) {
        conversationTtsService.stopAllAudio();
        conversationMicrophoneService.forceCleanup();
        try {
          const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
          microphoneArbitrator.release('conversation');
        } catch (error) {
          console.log('[ConversationOverlay] Emergency cleanup error');
        }
      }
    };
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = async () => {
    console.log('[ConversationOverlay] Closing modal - cleaning up resources');
    
    // 1. Stop all TTS audio playback immediately
    conversationTtsService.stopAllAudio();
    
    // 2. Force cleanup of microphone service to release all streams and contexts
    conversationMicrophoneService.forceCleanup();
    
    // 3. Release microphone arbitrator to free up browser permissions
    try {
      const { microphoneArbitrator } = require('@/services/microphone/MicrophoneArbitrator');
      microphoneArbitrator.release('conversation');
    } catch (error) {
      console.log('[ConversationOverlay] Could not release microphone arbitrator');
    }
    
    // 4. Re-initialize ChatController for normal chat functionality
    if (chat_id) {
      chatController.initializeConversation(chat_id);
    }
    
    // 5. Refresh conversation history to show new messages
    try {
      const { retryLoadMessages } = useChatStore.getState();
      await retryLoadMessages();
    } catch (error) {
      console.log('[ConversationOverlay] Failed to refresh conversation history');
    }
    
    // 6. Close the UI and reset all state
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    setConversationState('listening');
  };

  const handleStart = () => {
    // One-shot guard to prevent double invocation
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    if (isStarting) return; // Prevent double taps
    setIsStarting(true);

    if (!chat_id) {
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
    try {
      console.log('[ConversationOverlay] Processing audio...');
      setConversationState('processing');
      
      // Use established STT service (same as chatbar mic)
      const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation', sessionIdRef.current);
      const transcript = result.transcript;
      
      if (!transcript?.trim()) {
        console.log('[ConversationOverlay] Empty transcript, returning to listening');
        setConversationState('listening');
        return;
      }
      
      // Use established LLM service (same as chatbar) - use proper UUID
      const client_msg_id = uuidv4();
      // Add optimistic user message to store
      const userMessageId = uuidv4();
      useChatStore.getState().addMessage({
        id: userMessageId,
        chat_id: chat_id || '',
        role: 'user',
        text: transcript,
        createdAt: new Date().toISOString()
      });
      
      // Send message - this will trigger Realtime assistant response
      await llmService.sendMessage({
        chat_id: chat_id || '',
        text: transcript,
        client_msg_id
      });
      
      // DON'T restart recording here - let the Realtime effect handle it
      // This prevents the duplicate recording logic that causes MediaRecorder errors
      
    } catch (error) {
      console.error('[ConversationOverlay] Simple processing error:', error);
      setConversationState('connecting');
    }
  };

  // Watch for new assistant messages via Realtime and trigger TTS
  useEffect(() => {
    if (!permissionGranted || !chat_id) return;

    const latestMessage = messages
      .filter(m => m.chat_id === chat_id && m.role === 'assistant')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestMessage && latestMessage.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = latestMessage.id;
      
      setConversationState('replying');
      conversationTtsService.speakAssistant({
        chat_id: chat_id,
        messageId: latestMessage.id,
        text: latestMessage.text,
        sessionId: sessionIdRef.current,
        onComplete: async () => {
          setConversationState('listening');
          
          // Properly restart recording after TTS completes
          try {
            // Small delay to ensure TTS is fully complete
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const success = await conversationMicrophoneService.startRecording();
            if (!success) {
              console.error('[ConversationOverlay] Failed to start recording after TTS');
              setConversationState('connecting');
            }
          } catch (error) {
            console.error('[ConversationOverlay] Error starting recording after TTS:', error);
            setConversationState('connecting');
          }
        }
      });
    }
  }, [messages, permissionGranted, chat_id]);


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
