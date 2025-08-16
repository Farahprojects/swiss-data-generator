// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { uuid, token } = getChatTokens();

  // Validation - now requires secure tokens (uuid and token may be populated later)
  if (!uuid || !token) {
    console.log('[ReportChatScreen] Missing secure tokens, showing error');
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600 mb-4">Missing secure access tokens</p>
        <button onClick={() => navigate('/')} className="text-blue-600">
          Back to Home
        </button>
      </div>
    );
  }

  useChat(conversationId, uuid, token);

  return (
    <MobileViewportLock active>
      {/* This container now establishes a fixed, full-viewport context */}
      <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
        {/* ChatBox is now the direct child and will fill this container */}
        <ChatBox />
      </div>
    </MobileViewportLock>
  );
};

export default ReportChatScreen;
