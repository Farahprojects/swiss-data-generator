// src/screens/ReportChatScreen.tsx
import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getChatTokens } from '@/services/auth/chatTokens';

// Lazy load ChatBox for even faster initial render
const ChatBox = lazy(() => import('@/features/chat/ChatBox').then(module => ({ default: module.ChatBox })));

// Loading skeleton for the entire chat interface
const ChatBoxSkeleton = () => (
  <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
    <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0">
      {/* Left Sidebar Skeleton */}
      <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Mobile Header Skeleton */}
        <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
          <div className="w-9 h-9 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1" />
        </div>

        {/* Message Area Skeleton */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex-1 flex flex-col justify-end">
              <div className="p-4">
                <div className="h-8 bg-gray-200 rounded-lg w-3/4 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area Skeleton */}
        <div className="border-t border-gray-100 p-4">
          <div className="h-12 bg-gray-200 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const { uuid } = getChatTokens(); // Only need uuid, not token

  // Always initialize chat - let ChatBox handle edge cases
  useChat(chat_id, uuid || undefined);

  return (
    <MobileViewportLock active>
      <Suspense fallback={<ChatBoxSkeleton />}>
        <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
          <ChatBox />
        </div>
      </Suspense>
    </MobileViewportLock>
  );
};

export default ReportChatScreen;
