import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
// import { useConversationFlowMonitor } from '@/hooks/useConversationFlowMonitor';
// import { FlowMonitorIndicator } from './FlowMonitorIndicator'; // Hidden for production
import { AnimatePresence, motion } from 'framer-motion';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  // const { startMonitoring, stopMonitoring } = useConversationFlowMonitor();
  const hasStartedListening = useRef(false);
  const [hasBegunSession, setHasBegunSession] = useState(false);
  
  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    // 1. Stop all audio playback immediately (synchronous)
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    });
    
    // 2. Tell browser to stop all microphone access (synchronous)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // This will stop any active microphone streams
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {}); // Ignore errors, just ensure mic is released
    }
    
    // 3. Reset all conversation state (synchronous)
    chatController.resetConversationService();
    
    // 4. Close the UI (synchronous)
    closeConversation();
    setHasBegunSession(false); // Reset for next time
  };

  const handleBeginSession = () => {
    // This user gesture is required by browsers to enable audio playback.
    setHasBegunSession(true);
    console.log('[ConversationOverlay] User has begun session. Starting turn.');
    chatController.startTurn().catch(error => {
      console.error('[ConversationOverlay] Failed to start listening:', error);
    });
  }
  
  // Simple mount - set conversation mode, but wait for user to start.
  useEffect(() => {
    if (isConversationOpen && !hasStartedListening.current) {
      hasStartedListening.current = true;
      
      if (chat_id) {
        // Set conversation mode immediately when modal opens
        chatController.setConversationMode('convo', chat_id);
        console.log(`[ConversationOverlay] Conversation mode set for chat_id: ${chat_id}`);
      } else {
        console.error('[ConversationOverlay] Cannot start conversation mode without a chat_id.');
        // Optionally, close the overlay or show an error
        closeConversation();
        return;
      }
    }
  }, [isConversationOpen, chat_id, closeConversation]);
  
  // Simple cleanup when conversation closes
  useEffect(() => {
    if (!isConversationOpen && hasStartedListening.current) {
      hasStartedListening.current = false;
      
      // Reset conversation mode
      chatController.setConversationMode('normal', null);
      
      // Cleanup ChatController
      chatController.cleanup();
    }
  }, [isConversationOpen]);

  // Reset recovery attempts when conversation starts working
  useEffect(() => {
    if (status === 'recording') {
      // Conversation is working normally
    }
  }, [status]);

  // Map chat status to conversation state for UI
  const state = !hasBegunSession ? 'connecting' :
               status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
      {/* Flow Monitor Indicator - Hidden for production */}
      {/* <FlowMonitorIndicator /> */}
      
      {/* Centered content */}
      <div className="h-full w-full flex items-center justify-center px-6">
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
          
          {!hasBegunSession && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <button 
                onClick={handleBeginSession}
                onTouchEnd={handleBeginSession}
                className="px-8 py-4 bg-black text-white text-xl font-light rounded-full hover:bg-gray-800 active:bg-gray-900 transition-colors cursor-pointer select-none"
                style={{ touchAction: 'manipulation' }}
              >
                Start
              </button>
            </div>
          )}

          <p className="text-gray-500 font-light">
            {state === 'connecting' ? 'Tap to begin' :
             state === 'listening' ? 'Listening…' : 
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
      </div>
    </div>,
    document.body
  );
};
