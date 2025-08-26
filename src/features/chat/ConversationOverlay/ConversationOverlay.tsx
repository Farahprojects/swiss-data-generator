import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { useConversationLoop } from './useConversationLoop';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation

  // Self-contained conversation loop
  const conversationLoop = useConversationLoop({
    chat_id: chat_id || '',
    onError: (error) => {
      console.error('[ConversationOverlay] Conversation error:', error);
      // Could show toast or error UI here
    }
  });
  
  useEffect(() => {
    if (isConversationOpen) {
      // Disable external chat controller when modal opens
      chatController.cleanup();
    }
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    // 1. Stop the conversation loop
    conversationLoop.stop();
    
    // 2. Force cleanup of microphone service to release all streams and contexts
    conversationMicrophoneService.forceCleanup();
    
    // 3. Close the UI and reset all state
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    
    // 4. Re-initialize external chat controller for normal mode
    if (chat_id) {
      chatController.initializeConversation(chat_id);
    }
  };

  const handleStart = async () => {
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

    try {
      // SINGLE-GESTURE MEDIA INIT: Request microphone permission within the tap gesture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      });

      // Cache the stream for reuse across all turns in this session
      conversationMicrophoneService.cacheStream(stream);
      
      // Set flags for instant UI feedback
      setPermissionGranted(true);
      
      // Start the self-contained conversation loop
      await conversationLoop.start();
      
    } catch (error) {
      console.error('Microphone permission denied within gesture:', error);
      // If permission denied, revert the UI
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
    }
  };
  
  // Simple mount - set conversation mode and start listening immediately
  useEffect(() => {
    // This effect is now only for cleanup when the component unmounts or isOpen changes
    return () => {
      if (isConversationOpen) {
        // Ensure cleanup runs if the component unmounts unexpectedly
        handleModalClose();
      }
    };
  }, [isConversationOpen]);
  
  // Cleanup when conversation closes or component unmounts
  useEffect(() => {
    if (!isConversationOpen && permissionGranted) {
      // Conversation closed - stop the loop and cleanup
      conversationLoop.stop();
      conversationMicrophoneService.forceCleanup();
    }
  }, [isConversationOpen, permissionGranted, conversationLoop]);

  // Use local conversation state instead of external chat status
  const state = conversationLoop.state === 'listening' ? 'listening' :
               conversationLoop.state === 'processing' ? 'processing' :
               conversationLoop.state === 'replying' ? 'replying' :
               conversationLoop.state === 'error' ? 'connecting' : 'listening';

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
