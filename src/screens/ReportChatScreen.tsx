// src/screens/ReportChatScreen.tsx
import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useChat } from '@/features/chat/useChat';
import { useAuthedChat } from '@/hooks/useAuthedChat';
import { useAuth } from '@/contexts/AuthContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get guest_id from URL or session
  const guestIdFromUrl = searchParams.get('guest_id');
  const { uuid: guestIdFromSession } = getChatTokens();
  const guestId = guestIdFromUrl || guestIdFromSession;

  // Fallback to home if no identifiers found
  useEffect(() => {
    if (!user && !guestId && !chat_id) {
      navigate('/', { replace: true });
    }
  }, [user, guestId, chat_id, navigate]);

  // Use different hooks based on auth state
  if (user) {
    // Authenticated user - use conversation system
    useAuthedChat(chat_id);
  } else if (guestId || chat_id) {
    // Guest user - use traditional guest chat
    useChat(chat_id, guestId || undefined);
  } else {
    // No valid identifier, will redirect above
    return null;
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
