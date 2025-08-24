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
  
  useEffect(() => {
    if (isConversationOpen) {
      console.log('[MIC-LOG] ConversationOverlay opened. Waiting for user tap...');
    }
  }, [isConversationOpen]);

  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    // 1. Kill all audio immediately
    conversationTtsService.stopAllAudio();
    
    // 2. Stop microphone and tell listener we're done
    chatController.resetConversationService();
    
    // 3. End voice session to cleanup all resources
    conversationTtsService.endSession();
    
    // 4. Close the UI
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    setShowPermissionHint(false); // Reset permission hint
  };

  const handleStart = () => { // No longer async
    // One-shot guard to prevent double invocation
    if (hasStarted.current) {
      console.log('[MIC-LOG] handleStart already invoked, ignoring duplicate call');
      return;
    }
    hasStarted.current = true;

    if (isStarting) return; // Prevent double taps
    setIsStarting(true);

    console.log('[MIC-LOG] User tapped start. Unlocking controller and requesting microphone...');
    
    // Set flags immediately for instant UI feedback
    setPermissionGranted(true);
    
    // Start voice session to unlock both audio and microphone systems
    conversationTtsService.startVoiceSession();
    chatController.unlock();
    
    console.log('[MIC-LOG] Calling ChatController.startTurn immediately (gesture preserved)');
    
    if (chat_id) {
      chatController.setConversationMode('convo', chat_id);

      // Call startTurn in the background. It will request microphone permission.
      chatController.startTurn().catch(error => {
        console.error('[MIC-LOG] Failed to start turn, likely permission denied:', error);
        // If it fails (e.g., user denies permission), revert the UI.
        setPermissionGranted(false);
        setIsStarting(false);
        hasStarted.current = false;
      });

      // Watchdog timer remains to detect if the user denies permission or the mic fails silently.
      setTimeout(() => {
        const status = useChatStore.getState().status;
        const hasStream = conversationMicrophoneService.getState().hasStream;
        
        if (status !== 'recording' && !hasStream) {
          console.warn('[MIC-LOG] Watchdog: No recording status or stream after 1.5s, showing hint.');
          setShowPermissionHint(true);
        }
      }, 1500);

    } else {
      console.error("[ConversationOverlay] Cannot start conversation without a chat_id");
      closeConversation();
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
  
  // Simple cleanup when conversation closes
  useEffect(() => {
    if (!isConversationOpen && permissionGranted) {
      // Reset conversation mode
      chatController.setConversationMode('normal', null);
      
      // Cleanup ChatController
      chatController.cleanup();
    }
  }, [isConversationOpen, permissionGranted]);

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
