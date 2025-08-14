// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  useChat(conversationId);

  return (
    <div className="p-4 h-screen">
      <ChatBox />
    </div>
  );
};

export default ReportChatScreen;
