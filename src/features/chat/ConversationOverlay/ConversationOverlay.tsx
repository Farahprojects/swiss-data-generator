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
  
  useEffect(() => {
    if (isConversationOpen) {
      console.log('[MIC-LOG] ConversationOverlay opened. Waiting for user tap...');
    }
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = () => {
    console.log('[MIC-LOG] Conversation mode closing - ensuring clean slate');
    
    // 1. Complete audio reset for clean slate
    conversationTtsService.resetForCleanSlate();
    
    // 2. Stop microphone and clean up all resources
    chatController.resetConversationService();
    
    // 3. Force cleanup of microphone service to release all streams and contexts
    conversationMicrophoneService.forceCleanup();
    
    // 4. Close the UI and reset all state
    closeConversation();
    setPermissionGranted(false); // Reset permission on close
    setIsStarting(false); // Reset guard on close
    hasStarted.current = false; // Reset one-shot guard
    
    console.log('[MIC-LOG] Conversation mode closed - clean slate ready for next session');
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

    console.log('[MIC-LOG] User tapped start. Single-gesture media init: unlocking audio and requesting microphone...');
    
    // Set flags immediately for instant UI feedback
    setPermissionGranted(true);
    
    // Unlock audio playback within the user gesture
    conversationTtsService.unlockAudio();
    chatController.unlock();
    
    if (chat_id) {
      chatController.setConversationMode('convo', chat_id);

      // SINGLE-GESTURE MEDIA INIT: Request microphone permission within the tap gesture
      navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      })
      .then(stream => {
        console.log('[MIC-LOG] getUserMedia resolved within gesture - caching stream for session reuse');
        
        // Cache the stream for reuse across all turns in this session
        conversationMicrophoneService.cacheStream(stream);
        

        
        // Now start the first turn with the cached stream
        chatController.startTurn().catch(error => {
          console.error('[MIC-LOG] Failed to start turn after mic permission:', error);
          setPermissionGranted(false);
          setIsStarting(false);
          hasStarted.current = false;
        });
      })
      .catch(error => {
        console.error('[MIC-LOG] Microphone permission denied within gesture:', error);
        // If permission denied, revert the UI
        setPermissionGranted(false);
        setIsStarting(false);
        hasStarted.current = false;
      });



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
  
  // Cleanup when conversation closes or component unmounts
  useEffect(() => {
    if (!isConversationOpen && permissionGranted) {
      console.log('[MIC-LOG] Conversation closed - cleaning up resources');
      
      // Reset conversation mode
      chatController.setConversationMode('normal', null);
      
      // Cleanup ChatController
      chatController.cleanup();
      
      // Complete audio reset for clean slate
      conversationTtsService.resetForCleanSlate();
      
      // Force cleanup of microphone service to ensure clean slate
      conversationMicrophoneService.forceCleanup();
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
