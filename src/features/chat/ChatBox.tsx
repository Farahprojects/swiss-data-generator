import React, { useEffect, useRef, Suspense, lazy, useState } from 'react';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { chatController } from './ChatController';
import { supabase } from '@/integrations/supabase/client';

import { Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getChatTokens } from '@/services/auth/chatTokens';
import { MotionConfig } from 'framer-motion';
import { useConversationUIStore } from './conversation-ui-store';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { useNavigate, useSearchParams } from 'react-router-dom';
 

// Lazy load components for better performance
const MessageList = lazy(() => import('./MessageList').then(module => ({ default: module.MessageList })));
const ConversationOverlay = lazy(() => import('./ConversationOverlay/ConversationOverlay').then(module => ({ default: module.ConversationOverlay })));
const ChatSidebarControls = lazy(() => import('./ChatSidebarControls').then(module => ({ default: module.ChatSidebarControls })));
const ChatHeader = lazy(() => import('@/components/chat/ChatHeader').then(module => ({ default: module.ChatHeader })));
const NewChatButton = lazy(() => import('@/components/chat/NewChatButton').then(module => ({ default: module.NewChatButton })));
const ChatMenuButton = lazy(() => import('@/components/chat/ChatMenuButton').then(module => ({ default: module.ChatMenuButton })));

// Check if report is already generated for a chat_id (authenticated users only)
async function checkReportGeneratedStatus(chatId: string): Promise<boolean> {
  // For authenticated users, reports are handled differently
  // This function is kept for compatibility but always returns false
  return false;
}

interface ChatBoxProps {
  className?: string;
  onDelete?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onDelete }) => {
  const { error } = useChatStore();
  const { user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { uuid } = getChatTokens();
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  
  // Get chat_id from store for payment flow
  const { chat_id } = useChatStore();
  
  // Get user type from URL parameters - authenticated users only
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  
  // Determine user type and ID
  const isAuthenticated = !!userId;
  const currentUserId = userId;
  
  // User detection complete - no logging needed
  
  // Payment flow disabled for authenticated users
  const [shouldEnablePaymentFlow, setShouldEnablePaymentFlow] = useState(false);
  
  
  // ChatController methods for realtime updates (both text and conversation modes)
  const initializeAudioPipeline = chatController.initializeAudioPipeline.bind(chatController);
  const pauseMic = chatController.pauseMic.bind(chatController);
  const unpauseMic = chatController.unpauseMic.bind(chatController);
  // sendTextMessage removed - using unifiedWebSocketService.sendMessageDirect() directly
  const cancelMic = chatController.cancelMic.bind(chatController);
  const [signInPrompt, setSignInPrompt] = useState<{ show: boolean; feature: string }>({ 
    show: false, 
    feature: '' 
  });
  
  




  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure all listeners are cleaned up when component unmounts
      // Component unmounting, cleaning up all listeners
    };
  }, []);




  // Loading skeleton for message area
  const MessageListSkeleton = () => (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-col space-y-6">
        {/* Welcome message skeleton */}
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4 animate-pulse"></div>
          </div>
        </div>
        {/* Message skeleton */}
        <div className="flex items-end gap-3 justify-start">
          <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MotionConfig
        transition={{
          type: "spring",
          bounce: 0.2,
          duration: 0.6
        }}
      >
        <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0 mobile-chat-container" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' as any }}>
          {/* Left Sidebar (Desktop) */}
          <div className="hidden md:flex w-64 border-r border-gray-100 flex-col bg-gray-50/50 h-full">
            <div className="p-4 flex flex-col h-full">
              <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                <ChatSidebarControls onDelete={onDelete} />
              </Suspense>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-col flex-1 w-full min-w-0 mobile-chat-container">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
              <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Open menu"
                    className="p-2 rounded-md border border-gray-200 bg-white"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-[85%] sm:max-w-xs p-0"
                  style={{
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                  }}
                >
                  <div className="h-full flex flex-col bg-gray-50/50">
                    <div className="p-4 flex flex-col h-full bg-white">
                      <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                        <ChatSidebarControls onDelete={onDelete} onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)} />
                      </Suspense>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="flex items-center gap-2">
                {/* Sexy New Chat Button */}
                <Suspense fallback={<div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />}>
                  <NewChatButton />
                </Suspense>
                
                {/* 3 Dots Menu */}
                <Suspense fallback={<div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />}>
                  <ChatMenuButton />
                </Suspense>
              </div>
            </div>

            {/* Chat Header - Desktop only */}
            <div className="hidden md:block">
              <Suspense fallback={<div className="h-12 bg-white border-b border-gray-100" />}>
                <ChatHeader />
              </Suspense>
            </div>

            {/* Message List - Lazy Loaded */}
            <div className="flex-1 min-h-0 mobile-messages-area" style={{ overflowAnchor: 'none' as any }}>
              <Suspense fallback={<MessageListSkeleton />}>
                <MessageList />
              </Suspense>
            </div>

            {/* Footer Area - Natural flow for keyboard handling */}
            <div 
              className="mobile-input-area mobile-input-container"
            >
              {error && (
                <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">
                  {error}
                </div>
              )}
              <div className="border-t border-gray-100">
                <ChatInput />
              </div>
            </div>

            {/* Conversation Overlay */}
            <Suspense fallback={null}>
              <ConversationOverlay />
            </Suspense>
          </div>
        </div>
      </MotionConfig>


      {/* Settings Modal */}
      {/* {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )} */}

      {/* Sign In Prompt */}
      {signInPrompt.show && (
        <SignInPrompt
          feature={signInPrompt.feature}
          onClose={() => setSignInPrompt({ show: false, feature: '' })}
        />
      )}

      {/* Report Modal is now rendered by the provider */}
    </>
  );
};
