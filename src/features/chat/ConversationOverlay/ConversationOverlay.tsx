import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
// import { useConversationFlowMonitor } from '@/hooks/useConversationFlowMonitor';
// import { FlowMonitorIndicator } from './FlowMonitorIndicator'; // Hidden for production
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const chat_id = useChatStore((state) => state.chat_id);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation
  const [showPermissionHint, setShowPermissionHint] = useState(false); // Show hint if waiting too long
  const isClosing = useRef(false); // Guard against double close calls
  
  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    // Prevent double close calls
    if (isClosing.current) {
      console.log('[voice] handleModalClose already in progress, ignoring duplicate call');
      return;
    }
    isClosing.current = true;
    
    try {
      console.log('[voice] handleModalClose: Starting cleanup sequence...');
      
      // 1. Kill all audio immediately
      conversationTtsService.stopAllAudio();
      
      // 2. Stop microphone and tell listener we're done
      chatController.resetConversationService();
      
      // 3. End voice session to cleanup all resources
      conversationTtsService.endSession();
      
      console.log('[voice] handleModalClose: Cleanup sequence completed');
      
    } catch (error) {
      console.error('[voice] handleModalClose: Error during cleanup:', error);
      // Continue with UI close even if cleanup fails
    } finally {
      // 4. Close the UI - ALWAYS runs even if cleanup throws
      closeConversation();
      setPermissionGranted(false); // Reset permission on close
      setIsStarting(false); // Reset guard on close
      hasStarted.current = false; // Reset one-shot guard
      setShowPermissionHint(false); // Reset permission hint
      isClosing.current = false; // Reset close guard
      
      console.log('[voice] handleModalClose: UI closed successfully');
    }
  };

  const handleStart = async () => { // Now async
    // One-shot guard to prevent double invocation
    if (hasStarted.current) {
      console.log('[voice] handleStart already invoked, ignoring duplicate call');
      return;
    }
    hasStarted.current = true;

    if (isStarting) return; // Prevent double taps
    setIsStarting(true);

    console.log('[voice] tap');

    try {
      // Await startVoiceSession() within the gesture to ensure session is ready
      await conversationTtsService.startVoiceSession();
      
      // Assert readiness after session resolves
      const stream = conversationTtsService.getCachedMicStream();
      const ctx = conversationTtsService.getSharedAudioContext();
      
      console.log('[voice] session-assertions', {
        hasStream: !!stream,
        streamTracks: stream?.getAudioTracks().length,
        hasContext: !!ctx,
        contextState: ctx?.state
      });
      
      if (!stream || !ctx) {
        console.error('[voice] Session not ready after startVoiceSession');
        throw new Error('Voice session not ready - missing stream or context');
      }
      
      // Only now set permissionGranted to show the conversation UI
      setPermissionGranted(true);
      
      // Unlock controller and start the turn
      chatController.unlock();
      if (chat_id) {
        chatController.setConversationMode('convo', chat_id);
        await chatController.startTurn();
      } else {
        console.error("[voice] Cannot start conversation without a chat_id");
        closeConversation();
      }
      
    } catch (error) {
      console.error('[voice] handleStart failed:', error);
      
      // Revert UI to stable state on failure
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
      setShowPermissionHint(true);
    }
  };
  
  // This effect is now only for cleanup when the component unmounts or isOpen changes
  useEffect(() => {
    return () => {
      if (isConversationOpen && !isClosing.current) {
        // Ensure cleanup runs if the component unmounts unexpectedly
        console.log('[voice] Component unmounting, calling handleModalClose');
        handleModalClose();
      }
    };
  }, [isConversationOpen]);

  // Map chat status to conversation state for UI
  const state = status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
      <div className="h-full w-full flex items-center justify-center px-6">
        {!permissionGranted ? (
          <div 
            className="text-center text-gray-800 flex flex-col items-center gap-4 cursor-pointer"
            onClick={(e) => {
              // Use { once: true } equivalent by removing the handler after first click
              e.currentTarget.style.pointerEvents = 'none';
              handleStart();
            }}
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
            
            {/* Permission hint - shows if waiting too long for microphone */}
            {showPermissionHint && (
              <p className="text-sm text-orange-600 font-light text-center max-w-xs">
                Waiting for microphone permission… tap 'Allow' in the browser prompt.
              </p>
            )}
            
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
