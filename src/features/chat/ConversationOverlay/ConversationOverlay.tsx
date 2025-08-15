import React from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useMicBoss } from '@/hooks/useMicBoss';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const micBoss = useMicBoss('conversation-ui'); // Just for reading status

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={closeConversation}>
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-8" 
        style={{ height: '80%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {/* Mic status indicator - synced with MIC BOSS */}
          <div className={`flex items-center justify-center rounded-full w-40 h-40 md:w-56 md:h-56 shadow-lg transition-all duration-300 ${
            micBoss.isOn 
              ? 'bg-gradient-to-br from-green-500 to-green-600 scale-100' 
              : 'bg-gradient-to-br from-gray-400 to-gray-500 scale-95'
          }`}>
            {/* Mic icon */}
            <div className="text-white text-4xl">🎤</div>
          </div>
          <p className="text-gray-500 font-light">
            {micBoss.isOn ? `Mic ON - ${micBoss.activeRequests.length} active` : 'Mic OFF'}
          </p>
        </div>
        {/* Close button */}
        <button onClick={closeConversation} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
      </div>
    </div>,
    document.body
  );
};
