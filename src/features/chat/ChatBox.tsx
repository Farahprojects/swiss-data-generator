import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { useConversationMicManager } from '@/hooks/useConversationMicManager';
import { useConversationFSM } from './ConversationOverlay/useConversationFSM';
import { MicAuthorityProvider } from '@/contexts/MicAuthorityContext';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // GLOBAL CONVERSATION FLOW - Always active
  const { handleTranscriptReady } = useConversationFSM();
  
  // PERSISTENT MIC MANAGER - Always active, handles conversation mic control
  const micAuthority = useConversationMicManager(handleTranscriptReady);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <MicAuthorityProvider micAuthority={micAuthority}>
      <div className="flex flex-col flex-1 bg-white max-w-4xl w-full mx-auto border-x border-gray-100">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <MessageList />
        </div>
        {error && <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">{error}</div>}
        <ChatInput />
        <ConversationOverlay />
      </div>
    </MicAuthorityProvider>
  );
};
