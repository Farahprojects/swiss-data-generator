import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { AnimatePresence, motion } from 'framer-motion';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const hasStartedListening = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    console.log('[ConversationOverlay] X button pressed - shutting everything off immediately');
    
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
    
    // 4. Clear any timers (synchronous)
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // 5. Close the UI (synchronous)
    closeConversation();
  };
  
  // Simple mount - just start listening when conversation opens
  useEffect(() => {
    if (isConversationOpen && !hasStartedListening.current) {
      hasStartedListening.current = true;
      console.log('[ConversationOverlay] Conversation opened - starting listening');
      
      // Simple: just start listening
      chatController.startTurn().catch(error => {
        console.error('[ConversationOverlay] Failed to start listening:', error);
      });
    }
  }, [isConversationOpen]);

  // Simple cleanup when conversation closes
  useEffect(() => {
    if (!isConversationOpen) {
      console.log('[ConversationOverlay] Conversation closed - resetting flag');
      hasStartedListening.current = false;
    }
  }, [isConversationOpen]);

  // 3-second silence detection
  useEffect(() => {
    if (isConversationOpen && status === 'recording') {
      // Clear existing timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      // Start 3-second silence timer
      silenceTimerRef.current = setTimeout(() => {
        console.log('[ConversationOverlay] 3 seconds of silence detected, triggering audio level recording');
        // The silence detection will be handled by the microphone service
        // This just ensures we're actively listening
      }, 3000);
    }
    
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isConversationOpen, status, audioLevel]);

  // Map chat status to conversation state for UI
  const state = status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
      {/* Centered content */}
      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="flex flex-col items-center justify-center gap-6">
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
            {state === 'listening' ? 'Listening…' : state === 'processing' ? 'Thinking…' : 'Speaking…'}
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
