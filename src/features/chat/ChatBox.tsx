import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { useSimpleMic } from '@/hooks/useSimpleMic';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  // SIMPLE MIC CONTROL - Just on/off, no complexity
  const mic = useSimpleMic();

  // SIMPLE MIC CONTROL - Turn on when conversation opens, off when closes
  useEffect(() => {
    if (isConversationOpen) {
      console.log('[ChatBox] Conversation opened - turning mic ON');
      mic.turnOn();
    } else {
      console.log('[ChatBox] Conversation closed - turning mic OFF');
      mic.turnOff();
    }
  }, [isConversationOpen]); // Only depend on isConversationOpen

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 bg-white max-w-4xl w-full mx-auto border-x border-gray-100">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        <MessageList />
      </div>
      {error && <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">{error}</div>}
      <ChatInput />
      <ConversationOverlay />
    </div>
  );
};
