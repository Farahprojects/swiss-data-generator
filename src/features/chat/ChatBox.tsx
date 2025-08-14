import React from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';

export const ChatBox = () => {
  const { error } = useChatStore();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList />
      </div>
      {error && <div className="p-2 text-sm text-red-600 bg-red-100">{error}</div>}
      <ChatInput />
    </div>
  );
};
