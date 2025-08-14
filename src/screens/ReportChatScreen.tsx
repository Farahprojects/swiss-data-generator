// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';

const ReportChatScreen = () => {
  const { reportId } = useParams<{ reportId: string }>();
  // The useChat hook will automatically handle loading the conversation
  // if a reportId is present, or creating a new one.
  useChat(reportId);

  return (
    <div className="p-4 h-screen">
      <ChatBox />
    </div>
  );
};

export default ReportChatScreen;
