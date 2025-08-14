// src/features/chat/ChatInput.tsx
import React, { useState } from 'react';
import { Mic, Send, Volume2 } from 'lucide-react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';

export const ChatInput = () => {
  const [text, setText] = useState('');
  const status = useChatStore((state) => state.status);

  const handleSend = () => {
    if (text.trim()) {
      chatController.sendTextMessage(text);
      setText('');
    }
  };

  const handleMicClick = () => {
    if (status === 'recording') {
      chatController.endTurn();
    } else {
      chatController.startTurn();
    }
  };

  return (
    <div className="flex items-center p-2 bg-white border-t border-gray-200">
      <button 
        className="p-2 text-gray-500 hover:text-gray-700"
        onClick={handleMicClick}
      >
        <Mic size={24} />
      </button>
      <button className="p-2 text-gray-500 hover:text-gray-700">
        <Volume2 size={24} />
      </button>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts about mindset..."
        className="flex-1 px-4 py-2 mx-2 text-base font-light bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-300"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSend();
          }
        }}
      />
      <button
        onClick={handleSend}
        className="p-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:bg-purple-300"
        disabled={!text.trim()}
      >
        <Send size={20} />
      </button>
    </div>
  );
};
