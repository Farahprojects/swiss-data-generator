// src/features/chat/ChatInput.tsx
import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
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
    <div className="flex items-end p-4 bg-white border-t border-gray-200/80">
      <button 
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        onClick={handleMicClick}
      >
        <Mic size={24} />
      </button>
      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
        <Volume2 size={24} />
      </button>
      <TextareaAutosize
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts about mindset..."
        className="flex-1 px-4 py-2 mx-2 text-base font-light bg-gray-100/80 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
        maxRows={5}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <button
        onClick={handleSend}
        className="p-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:bg-purple-300 disabled:opacity-50 transition-colors"
        disabled={!text.trim() || status !== 'idle'}
      >
        <Send size={20} />
      </button>
    </div>
  );
};
