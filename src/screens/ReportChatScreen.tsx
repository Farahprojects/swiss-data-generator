// src/screens/ReportChatScreen.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [{ uuid, token }, setTokens] = useState(() => getChatTokens());
  const [logged, setLogged] = useState(false);

  // Poll storage until tokens are available
  useEffect(() => {
    if (uuid && token) return;
    const id = setInterval(() => {
      const next = getChatTokens();
      if ((next.uuid && next.token) && (!uuid || !token)) {
        setTokens(next);
      }
    }, 300);
    return () => clearInterval(id);
  }, [uuid, token]);

  // Log once when tokens are ready
  useEffect(() => {
    if (uuid && token && !logged) {
      console.log(`[ReportChatScreen] Tokens ready: uuid=${uuid}, hasToken=${!!token}`);
      setLogged(true);
    }
  }, [uuid, token, logged]);

  // Initialize chat when tokens are ready
  useChat(conversationId, uuid || undefined, token || undefined);

  return (
    <MobileViewportLock active>
      <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
        {/* If tokens not ready, show lightweight waiting state */}
        {!uuid || !token ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700" />
              <span>Preparing your chat…</span>
            </div>
          </div>
        ) : (
          <ChatBox />
        )}
      </div>
    </MobileViewportLock>
  );
};

export default ReportChatScreen;
