import React, { useEffect, useRef, Suspense, lazy, useState } from 'react';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthedChat } from '@/hooks/useAuthedChat';
import { Menu, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getChatTokens } from '@/services/auth/chatTokens';
import { MotionConfig } from 'framer-motion';
import { useConversationUIStore } from './conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { logUserError } from '@/services/errorService';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { useNavigate } from 'react-router-dom';

// Lazy load components for better performance
const MessageList = lazy(() => import('./MessageList').then(module => ({ default: module.MessageList })));
const ConversationOverlay = lazy(() => import('./ConversationOverlay/ConversationOverlay').then(module => ({ default: module.ConversationOverlay })));
const ErrorStateHandler = lazy(() => import('@/components/public-report/ErrorStateHandler').then(module => ({ default: module.default })));
const ChatSidebarControls = lazy(() => import('./ChatSidebarControls').then(module => ({ default: module.ChatSidebarControls })));

export const ChatBox = () => {
  const { error } = useChatStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { uuid } = getChatTokens();
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  const [signInPrompt, setSignInPrompt] = useState<{ show: boolean; feature: string }>({ 
    show: false, 
    feature: '' 
  });
  
  // Get error state from report ready store
  const errorState = useReportReadyStore((state) => state.errorState);
  const setErrorState = useReportReadyStore((state) => state.setErrorState);

  // Handle auth-gated features
  const handleCalendarClick = () => {
    if (user) {
      navigate('/calendar');
    } else {
      setSignInPrompt({ show: true, feature: 'Calendar' });
    }
  };



  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure all listeners are cleaned up when component unmounts
      console.log('[ChatBox] Component unmounting, cleaning up all listeners');
    };
  }, []);



  // Handle error logging
  const handleTriggerErrorLogging = async (guestReportId: string, email: string) => {
    if (errorState?.requires_error_logging) {
      try {
        await logUserError({
          guestReportId,
          errorType: errorState.type,
          errorMessage: errorState.message,
          timestamp: errorState.logged_at || new Date().toISOString()
        });
      } catch (error) {
        console.error('Error logging user error:', error);
      }
    }
  };

  // Handle session cleanup
  const handleCleanupSession = async () => {
    console.log('[ChatBox] Starting comprehensive session cleanup');
    
    try {
      // Clear error state
      setErrorState(null);
      
      // Clear chat store
      const { clearChat } = useChatStore.getState();
      clearChat();
      
      // Clear conversation UI store
      const { closeConversation } = useConversationUIStore.getState();
      closeConversation();
      
      // Clear session storage
      const sessionKeys = ['therai_chat_id', 'report_generation_status'];
      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      console.log('[ChatBox] Session cleanup completed');
    } catch (error) {
      console.error('[ChatBox] Error during session cleanup:', error);
    }
  };

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
        <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0">
          {/* Left Sidebar (Desktop) */}
          <div className="hidden md:flex w-64 border-r border-gray-100 flex-col bg-gray-50/50">
            <div className="p-4 h-full flex flex-col">
              {/* Calendar Button for Desktop - Only for Auth Users */}
              {user && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={handleCalendarClick}
                    className="w-full justify-start font-light text-sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                </div>
              )}
              
              <div className="flex-1">
                <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                  <ChatSidebarControls />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-col flex-1 w-full min-w-0">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    aria-label="Open menu"
                    className="p-2 rounded-md border border-gray-200 bg-white"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:max-w-xs p-0">
                  <div className="p-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-light italic">Settings</h2>
                    </div>
                    <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                      <ChatSidebarControls />
                    </Suspense>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="flex-1" />
              
              {/* Calendar Button for Mobile - Only for Auth Users */}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCalendarClick}
                  className="px-3 py-1.5 text-xs font-light"
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Calendar
                </Button>
              )}
            </div>

            {/* Message List - Lazy Loaded */}
            <div className="flex-1 min-h-0">
              <Suspense fallback={<MessageListSkeleton />}>
                <MessageList />
              </Suspense>
            </div>

            {/* Footer Area */}
            <div className="pb-safe">
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

      {/* Error Handler Popup */}
      {/* Commented out as requested - keeping file but disabling flow */}
      {/* {errorState && (
        <Suspense fallback={<div>Loading error handler...</div>}>
          <ErrorStateHandler
            errorState={errorState}
            onRetry={handleTriggerErrorLogging}
            onCleanup={handleCleanupSession}
            onClose={() => setErrorState(null)}
          />
        </Suspense>
      )} */}

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
