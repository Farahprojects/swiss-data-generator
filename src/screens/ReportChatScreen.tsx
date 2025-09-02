// src/screens/ReportChatScreen.tsx
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get guest_id from URL if present
  const guestId = searchParams.get('guest_id');

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
