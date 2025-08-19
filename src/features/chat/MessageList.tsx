import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useConversationUIStore } from './conversation-ui-store';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { getMessagesForConversation } from '@/services/api/messages';
import { getSessionIds } from '@/services/auth/sessionIds';
import { llmService } from '@/services/llm/llmService';

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
  const { chatId } = getSessionIds();
  const lastMessageId = useChatStore((state) => state.lastMessageId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<Partial<Message> | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);

  // Effect to fetch initial and updated messages from DB
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const fetchedMessages = await getMessagesForConversation(chatId);
        setMessages(fetchedMessages);
        
        if (initialMessageCount === null && fetchedMessages.length > 0) {
          setInitialMessageCount(fetchedMessages.length);
        }
      } catch (error) {
        console.error('[MessageList] Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId, lastMessageId]);

  // Refresh messages when lastMessageId changes  
  useEffect(() => {
    if (lastMessageId && chatId) {
      const refetchMessages = async () => {
        try {
          const fetchedMessages = await getMessagesForConversation(chatId);
          setMessages(fetchedMessages);
        } catch (error) {
          console.error('[MessageList] Error refetching messages:', error);
        }
      };
      refetchMessages();
    }
  }, [lastMessageId, chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-full justify-center items-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  const displayedMessages = [...messages, ...(streamingMessage ? [streamingMessage as Message] : [])];

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
            const isFromHistory = initialMessageCount !== null && index < initialMessageCount;
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isLast={index === displayedMessages.length - 1}
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
