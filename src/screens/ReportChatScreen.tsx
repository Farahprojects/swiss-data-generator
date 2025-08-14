// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  useChat(conversationId);

  return (
    <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full h-full max-w-2xl mx-auto flex flex-col">
        <ChatBox />
      </div>
    </div>
  );
};

export default ReportChatScreen;
