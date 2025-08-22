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
import { sessionService } from '@/services/conversation/sessionService';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  // const { startMonitoring, stopMonitoring } = useConversationFlowMonitor();
  const hasStartedListening = useRef(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
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
  };
  
  // Simple mount - just start listening when conversation opens
  useEffect(() => {
    if (isConversationOpen && !hasStartedListening.current) {
      hasStartedListening.current = true;
      
      // Start conversation session and set mode
      const startConversationSession = async () => {
        try {
          if (!chat_id) {
            console.error('[ConversationOverlay] No chat_id available for session start');
            return;
          }

          console.log('[ConversationOverlay] Starting conversation session for chat_id:', chat_id);
          const sessionResponse = await sessionService.startSession(chat_id, 'convo');
          
          // Set conversation mode in ChatController
          chatController.setConversationMode('convo', sessionResponse.sessionId);
          setCurrentSessionId(sessionResponse.sessionId);
          
          console.log('[ConversationOverlay] Conversation mode set - sessionId:', sessionResponse.sessionId);
          
          // Start flow monitoring with auto-recovery
          // startMonitoring();
          
          // Setup auto-recovery system
          // import('@/services/conversation/ConversationFlowMonitor').then(({ conversationFlowMonitor }) => {
          //   conversationFlowMonitor.setupAutoRecovery(
          //     // Auto-recovery trigger: try to restart conversation
          //     () => {
          //       setRecoveryAttempts(prev => prev + 1);
          //       chatController.startTurn().catch(error => {
          //         console.error('[ConversationOverlay] Auto-recovery failed:', error);
          //       });
          //     },
          //     // Max attempts reached: show error UI
          //     () => {
          //       setShowConnectionError(true);
          //     }
          //   );
          // });
          
          // Simple: just start listening
          chatController.startTurn().catch(error => {
            console.error('[ConversationOverlay] Failed to start listening:', error);
          });
          
        } catch (error) {
          console.error('[ConversationOverlay] Failed to start conversation session:', error);
        }
      };
      
      startConversationSession();
    }
  }, [isConversationOpen, chat_id]);

  // Simple cleanup when conversation closes
  useEffect(() => {
    if (!isConversationOpen && hasStartedListening.current) {
      hasStartedListening.current = false;
      
      // End conversation session
      if (currentSessionId) {
        sessionService.endSession(currentSessionId).catch(error => {
          console.error('[ConversationOverlay] Error ending session:', error);
        });
        setCurrentSessionId(null);
      }
      
      // Reset conversation mode
      chatController.setConversationMode('normal', null);
      
      // Stop monitoring
      // stopMonitoring();
      
      // Cleanup ChatController
      chatController.cleanup();
    }
  }, [isConversationOpen, currentSessionId]);

  // Reset recovery attempts when conversation starts working
  useEffect(() => {
    if (status === 'recording') {
      // Conversation is working normally
    }
  }, [status]);

  // Map chat status to conversation state for UI
  const state = status === 'recording' ? 'listening' : 
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
      </div>
    </div>,
    document.body
  );
};
