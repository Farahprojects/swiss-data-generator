import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { useConversationFlowMonitor } from '@/hooks/useConversationFlowMonitor';
// import { FlowMonitorIndicator } from './FlowMonitorIndicator'; // Hidden for production
import { ConnectionErrorFallback } from './ConnectionErrorFallback';
import { AnimatePresence, motion } from 'framer-motion';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const { startMonitoring, stopMonitoring } = useConversationFlowMonitor();
  const hasStartedListening = useRef(false);
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  
  // Handle retry from error UI
  const handleRetry = () => {
    setShowConnectionError(false);
    setRecoveryAttempts(0);
    hasStartedListening.current = false; // Reset flag to trigger restart
  };
  
  // Reset recovery attempts when conversation is working
  const resetRecoveryAttempts = () => {
    if (recoveryAttempts > 0) {
      setRecoveryAttempts(0);
    }
  };
  
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
      setShowConnectionError(false); // Reset error state
      setRecoveryAttempts(0); // Reset recovery attempts
      
      // Start flow monitoring with auto-recovery
      startMonitoring();
      
      // Setup auto-recovery system
      import('@/services/conversation/ConversationFlowMonitor').then(({ conversationFlowMonitor }) => {
        conversationFlowMonitor.setupAutoRecovery(
          // Auto-recovery trigger: try to restart conversation
          () => {
            setRecoveryAttempts(prev => prev + 1);
            chatController.startTurn().catch(error => {
              console.error('[ConversationOverlay] Auto-recovery failed:', error);
            });
          },
          // Max attempts reached: show error UI
          () => {
            setShowConnectionError(true);
          }
        );
      });
      

      
      // Simple: just start listening
      chatController.startTurn().catch(error => {
        console.error('[ConversationOverlay] Failed to start listening:', error);
      });
    }
  }, [isConversationOpen, startMonitoring]);

  // Simple cleanup when conversation closes
  useEffect(() => {
    if (!isConversationOpen) {
      hasStartedListening.current = false;
      
      // Stop flow monitoring
      stopMonitoring();
    }
  }, [isConversationOpen, stopMonitoring]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup ChatController timeouts when component unmounts
      chatController.cleanup();
    };
  }, []);

  // Reset recovery attempts when conversation starts working
  useEffect(() => {
    if (status === 'recording' && recoveryAttempts > 0) {
      resetRecoveryAttempts();
    }
  }, [status, recoveryAttempts]);



  // Map chat status to conversation state for UI
  const state = recoveryAttempts > 0 ? 'connecting' :
               status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  // Show connection error UI if auto-recovery failed
  if (showConnectionError) {
    return createPortal(
      <ConnectionErrorFallback onRetry={handleRetry} />,
      document.body
    );
  }

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
            {state === 'connecting' ? `Connecting... (${recoveryAttempts}/2)` : 
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
