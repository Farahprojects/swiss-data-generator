// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const { uuid } = getChatTokens(); // Only need uuid, not token

  // Always initialize chat - let ChatBox handle edge cases
  useChat(chat_id, uuid || undefined);

  return (
    <MobileViewportLock active>
      <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
        <ChatBox />
      </div>
    </MobileViewportLock>
  );
};

export default ReportChatScreen;
