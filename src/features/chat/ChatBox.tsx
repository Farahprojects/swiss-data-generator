import React from 'react';
import { MessageList } from './MessageList';
import { MicButton } from './MicButton';
import { useChatStore } from '@/core/store';

export const ChatBox = () => {
  const { status, error } = useChatStore();

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList />
      </div>
      {error && <div className="p-2 text-sm text-red-600 bg-red-100">{error}</div>}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex justify-center">
        <MicButton />
      </div>
    </div>
  );
};
