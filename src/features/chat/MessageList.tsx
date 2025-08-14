import React, { useRef, useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle, MessageCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';

const MessageItem = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-3 rounded-2xl max-w-lg lg:max-w-xl ${
          isUser
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <p className="text-base font-light leading-relaxed">{message.text}</p>
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
      <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
        <MessageCircle size={48} className="mb-4" />
        <h2 className="text-2xl font-light text-gray-800">Start the Conversation</h2>
        <p className="mt-2 font-light">
          Ask anything or tap the mic to begin.
        </p>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      <div ref={scrollRef} />
    </>
  );
};
