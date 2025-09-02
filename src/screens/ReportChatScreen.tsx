// src/screens/ReportChatScreen.tsx
import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useChat } from '@/features/chat/useChat';
import { useAuthedChat } from '@/hooks/useAuthedChat';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
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

  // Always call hooks unconditionally to avoid React violations
  const authedChatResult = useAuthedChat(chat_id);
  const guestChatResult = useChat(chat_id, guestId || undefined);
  
  // Handle the results based on auth state
  useEffect(() => {
    if (user) {
      // Authenticated user - conversation system is active
    } else if (guestId || chat_id) {
      // Guest user - traditional guest chat is active
    }
  }, [user, guestId, chat_id]);

  return (
    <SettingsModalProvider>
      <ReportModalProvider>
        <MobileViewportLock active>
          <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
            <ChatBox />
          </div>
        </MobileViewportLock>
      </ReportModalProvider>
    </SettingsModalProvider>
  );
};

export default ReportChatScreen;
