// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { uuid, token } = location.state || {};

  // Validation - now requires secure tokens
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
