// src/features/chat/ChatInput.tsx
import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { useConversationUIStore } from './conversation-ui-store';

export const ChatInput = () => {
  const [text, setText] = useState('');
  const status = useChatStore((state) => state.status);
  const [isMuted, setIsMuted] = useState(false);
  const { isConversationOpen, openConversation, closeConversation } = useConversationUIStore();

  const handleSend = () => {
    if (text.trim()) {
      chatController.sendTextMessage(text);
      setText('');
    }
  };

  const handleMicClick = () => {
    if (!isConversationOpen) {
      openConversation();
      chatController.startTurn();
      return;
    }
    if (status === 'recording') {
      chatController.endTurn();
    } else {
      closeConversation();
    }
  };

  const isRecording = status === 'recording';

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 p-4 pb-6">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <button 
          className="p-3 text-gray-500 hover:text-gray-900 transition-colors"
          onClick={handleMicClick}
        >
          <Mic size={24} className={isRecording ? 'text-red-500' : ''} />
        </button>
        <button 
          className="p-3 text-gray-500 hover:text-gray-900 transition-colors"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <TextareaAutosize
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your thoughts..."
          className="flex-1 px-4 py-2.5 text-base font-light bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent resize-none"
          maxRows={6}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          className="p-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-70 transition-all"
          disabled={!text.trim() || status !== 'idle'}
        >
          <Send size={20} />
        </button>
      </div>
      <div className="max-w-4xl mx-auto mt-2">
        <p className="text-xs text-gray-400 font-light text-center">
          Therai can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
