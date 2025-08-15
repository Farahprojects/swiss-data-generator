import React from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  
  // PROPER MODAL CLOSE - Stop conversation and turn off mic
  const handleModalClose = () => {
    console.log('[ConversationOverlay] Modal closing - resetting conversation service');
    chatController.resetConversationService(); // This fully resets the service
    closeConversation(); // This closes the UI
  };
  
  // Map chat status to conversation state for UI
  const state = status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={handleModalClose}>
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-8" 
        style={{ height: '80%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <VoiceBubble state={state} audioLevel={audioLevel} />
          {/* Placeholder captions */}
          <p className="text-gray-500 font-light">{state === 'listening' ? 'Listening…' : state === 'processing' ? 'Thinking…' : 'Speaking…'}</p>
        </div>
        {/* Close button */}
        <button onClick={handleModalClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
      </div>
    </div>,
    document.body
  );
};
