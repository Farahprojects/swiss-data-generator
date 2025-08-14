import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white max-w-4xl w-full mx-auto border-x border-gray-100">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        <MessageList />
      </div>
      {error && <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">{error}</div>}
      <ChatInput />
    </div>
  );
};
