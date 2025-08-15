import React from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={closeConversation}>
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-8" 
        style={{ height: '80%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {/* Simple placeholder - no complex state */}
          <div className="flex items-center justify-center rounded-full w-40 h-40 md:w-56 md:h-56 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600">
            {/* Mic icon or simple indicator */}
          </div>
          <p className="text-gray-500 font-light">Mic Test</p>
        </div>
        {/* Close button */}
        <button onClick={closeConversation} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
      </div>
    </div>,
    document.body
  );
};
