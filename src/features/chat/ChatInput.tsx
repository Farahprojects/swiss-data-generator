// src/features/chat/ChatInput.tsx
import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send } from 'lucide-react';
import { useChatController } from './ChatController';

export const ChatInput = () => {
  const [text, setText] = useState('');

  const { sendTextMessage } = useChatController();
  
  const handleSend = () => {
    if (text.trim()) {
      sendTextMessage(text);
      setText('');
    }
  };

  // const handleSpeakerClick = () => {
  //   if (!isConversationOpen) {
  //     openConversation();
  //     chatController.startTurn();
  //     return;
  //   }
  //   if (status === 'recording') {
  //     chatController.endTurn();
  //   } else {
  //     closeConversation();
  //   }
  // };

  const isRecording = status === 'recording';

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 p-2">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <TextareaAutosize
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-2.5 pr-12 text-base font-light bg-white border-2 border-black rounded-3xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-black resize-none text-black placeholder-gray-500 overflow-y-auto"
            maxRows={4}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <button 
              className="p-2 text-gray-500 hover:text-gray-900 transition-all duration-200 ease-in-out"
              onClick={handleSend}
              disabled={!text.trim()}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-2">
        <p className="text-xs text-gray-400 font-light text-center">
          Therai can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
