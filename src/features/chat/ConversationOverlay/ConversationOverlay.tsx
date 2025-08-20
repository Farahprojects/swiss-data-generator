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
  
  // BULLETPROOF MODAL CLOSE - Handle all edge cases
  const handleModalClose = () => {
    console.log('[ConversationOverlay] Closing conversation - stopping all audio');
    
    // Emergency stop all audio playback
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    });
    
    // Stop TTS audio playback
    import('@/services/voice/ttsAudio').then(({ stopTtsAudio }) => {
      stopTtsAudio();
    });
    
    // Force cleanup conversation microphone service
    import('@/services/microphone/ConversationMicrophoneService').then(({ conversationMicrophoneService }) => {
      conversationMicrophoneService.forceCleanup();
    });
    
    // Force release microphone arbitrator
    import('@/services/microphone/MicrophoneArbitrator').then(({ microphoneArbitrator }) => {
      microphoneArbitrator.forceRelease();
    });
    
    // Force reset conversation service (handles mic cleanup)
    chatController.resetConversationService();
    
    // Clear any timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Close the UI
    closeConversation();
  };
  
  // Auto-start listening when conversation opens
  useEffect(() => {
    if (isConversationOpen && !hasStartedListening.current) {
      hasStartedListening.current = true;
      console.log('[ConversationOverlay] Auto-starting listening on mount');
      
      // Ensure clean state before starting
      chatController.resetConversationService();
      
      // Force release microphone arbitrator to ensure clean state
      import('@/services/microphone/MicrophoneArbitrator').then(({ microphoneArbitrator }) => {
        microphoneArbitrator.forceRelease();
      });
      
      // Small delay to ensure reset is complete
      setTimeout(() => {
        // Start listening immediately
        chatController.startTurn().catch(error => {
          console.error('[ConversationOverlay] Failed to auto-start listening:', error);
        });
      }, 100);
    }
  }, [isConversationOpen]);

  // Reset flag when conversation closes
  useEffect(() => {
    if (!isConversationOpen) {
      console.log('[ConversationOverlay] Conversation closed - cleaning up');
      hasStartedListening.current = false;
      
      // Clear timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Ensure all audio is stopped when modal closes
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
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
