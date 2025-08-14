import React from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';

const MessageItem = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-sm flex items-center gap-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        <p className="text-sm">{message.text}</p>
        {message.audioUrl && (
          <button
            onClick={() => audioPlayer.play(message.audioUrl!)}
            className={isUser ? "text-white/80 hover:text-white" : "text-gray-600/80 hover:text-gray-800"}
          >
            <PlayCircle size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">
          No messages yet. Tap the mic to start.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
};
