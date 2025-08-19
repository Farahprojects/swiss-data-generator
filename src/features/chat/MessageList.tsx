import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { useConversationUIStore } from './conversation-ui-store';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { getMessagesForConversation } from '@/services/api/messages';
import { getSessionIds } from '@/services/auth/sessionIds';
import { useChatHistory } from '@/features/chat/useChatHistory';

const MessageItem = ({ message, isLast, isFromHistory }: { message: Message; isLast: boolean; isFromHistory?: boolean }) => {
  const isUser = message.role === 'user';
  const isConversationOpen = useConversationUIStore((state) => state.isConversationOpen);
  
  // Animate only if it's the very last message, not from history, and conversation mode is off.
  const shouldAnimate = !isUser && isLast && !isFromHistory && !isConversationOpen;

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl ${
          isUser
            ? 'bg-gray-200 text-black'
            : 'text-black'
        }`}
      >
        <p className="text-base font-light leading-relaxed text-left">
          <TypewriterText 
            text={message.text || ''} 
            msPerChar={40}
            disabled={!shouldAnimate}
            className="whitespace-pre-wrap"
          />
        </p>
        {/* Audio is played live during conversation mode - no stored audio to replay */}
      </div>
    </div>
  );
};

export const MessageList = () => {
  const { messages: historicalMessages, loading, error } = useChatHistory();
  const { streamingText, isStreaming, lastMessageId } = useChatStore((state) => ({
    streamingText: state.streamingText,
    isStreaming: state.isStreaming,
    lastMessageId: state.lastMessageId,
  }));

  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historicalMessages.length, streamingText]); // Scroll on new messages or new text

  if (loading) {
    return (
      <div className="flex flex-col min-h-full justify-center items-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-full justify-center items-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const displayedMessages: Message[] = [
    ...historicalMessages,
    ...(isStreaming ? [{
      id: 'streaming-message',
      role: 'assistant',
      text: streamingText,
      createdAt: new Date().toISOString(),
      status: 'streaming'
    } as any] : [])
  ];

  return (
    <div className="flex flex-col min-h-full">
      {displayedMessages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <h2 className="text-3xl font-light text-gray-800 text-left">Let's tune into the energy behind your chart</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          {displayedMessages.map((msg, index) => {
            const isLastMessage = index === displayedMessages.length - 1;
            // A message is "from history" if it's not the last one while we are streaming.
            const isFromHistory = isStreaming ? !isLastMessage : false;

            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isLast={isLastMessage}
                isFromHistory={isFromHistory}
              />
            );
          })}
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  );
};
