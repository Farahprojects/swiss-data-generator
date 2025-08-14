import React from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useConversationFSM } from './useConversationFSM';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const { state } = useConversationFSM();

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={closeConversation}>
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-8" 
        style={{ height: '80%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <VoiceBubble state={state} />
          {/* Placeholder captions */}
          <p className="text-gray-500 font-light">{state === 'listening' ? 'Listening…' : state === 'processing' ? 'Thinking…' : 'Speaking…'}</p>
        </div>
        {/* Close button */}
        <button onClick={closeConversation} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
      </div>
    </div>,
    document.body
  );
};
