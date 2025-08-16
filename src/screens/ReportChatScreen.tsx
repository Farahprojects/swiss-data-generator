// src/screens/ReportChatScreen.tsx
import React, { useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';

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
    <div className="font-sans antialiased text-gray-800 bg-gray-50 h-screen overflow-hidden flex flex-col">
      <div className="flex-1 flex min-h-0">
        <ChatBox />
      </div>
    </div>
  );
};

export default ReportChatScreen;
