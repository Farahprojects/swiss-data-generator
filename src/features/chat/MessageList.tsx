import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useConversationUIStore } from './conversation-ui-store';
import { TypewriterText } from '@/components/ui/TypewriterText';

const MessageItem = ({ message, isLast, isFromHistory }: { message: Message; isLast: boolean; isFromHistory?: boolean }) => {
  const isUser = message.role === 'user';
  const isConversationOpen = useConversationUIStore((state) => state.isConversationOpen);
  
  // Skip animation for existing messages from history, if it's not the last message, or if conversation mode is active
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
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);

  // Track initial message count to determine which messages are from history
  useEffect(() => {
    if (initialMessageCount === null && messages.length > 0) {
      setInitialMessageCount(messages.length);
    }
  }, [messages.length, initialMessageCount]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col min-h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <h2 className="text-3xl font-light text-gray-800 text-left">Let's tune into the energy behind your chart</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          {messages.map((msg, index) => {
            const isFromHistory = initialMessageCount !== null && index < initialMessageCount;
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isLast={index === messages.length - 1}
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
