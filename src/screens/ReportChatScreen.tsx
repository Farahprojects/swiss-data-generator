// src/screens/ReportChatScreen.tsx
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  useChat(conversationId);

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 h-screen overflow-hidden">
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <ChatBox />
        </div>
      </div>
    </div>
  );
};

export default ReportChatScreen;
