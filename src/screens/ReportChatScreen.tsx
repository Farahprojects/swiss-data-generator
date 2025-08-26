// src/screens/ReportChatScreen.tsx
import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '@/features/chat/useChat';
import { useAuthedChat } from '@/hooks/useAuthedChat';
import { useAuth } from '@/contexts/AuthContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const { user } = useAuth();
  const { uuid } = getChatTokens(); // Only need uuid, not token

  // Use different hooks based on auth state
  if (user) {
    // Authenticated user - use conversation system
    useAuthedChat(chat_id);
  } else {
    // Guest user - use traditional guest chat
    useChat(chat_id, uuid || undefined);
  }

  return (
    <MobileViewportLock active>
      <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
        <ChatBox />
      </div>
    </MobileViewportLock>
  );
};

export default ReportChatScreen;
