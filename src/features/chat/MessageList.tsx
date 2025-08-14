import React, { useRef, useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle, MessageCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useTypewriter } from '@/hooks/useTypewriter';

const MessageItem = ({ message, isLast }: { message: Message; isLast: boolean }) => {
  const isUser = message.role === 'user';
  const displayText = useTypewriter(message.text || '', 30);
  
  const textContent = isUser || !isLast ? message.text : displayText;

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-3 rounded-2xl max-w-lg lg:max-w-xl ${
          isUser
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <p className="text-base font-light leading-relaxed">{textContent}</p>
        {message.audioUrl && (
          <button
            onClick={() => audioPlayer.play(message.audioUrl!)}
            className={`mt-2 flex items-center gap-2 text-sm transition-colors ${
              isUser 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <PlayCircle size={18} />
            <span>Play Audio</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-end pb-8">
        <div className="p-4">
          <MessageCircle size={48} className="text-gray-300" />
          <h2 className="mt-4 text-3xl font-light text-gray-800">Ready to talk?</h2>
          <p className="mt-2 text-gray-500 font-light">
            Your chat history will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, index) => (
        <MessageItem key={msg.id} message={msg} isLast={index === messages.length - 1} />
      ))}
      <div ref={scrollRef} />
    </>
  );
};
