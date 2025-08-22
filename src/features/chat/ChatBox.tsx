import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getChatTokens } from '@/services/auth/chatTokens';
import { startReportReadyListener, stopReportReadyListener } from '@/services/report/reportReadyListener';
import { MotionConfig } from 'framer-motion';
import { useConversationUIStore } from './conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { logUserError } from '@/services/errorService';

// Lazy load components for better performance
const MessageList = lazy(() => import('./MessageList').then(module => ({ default: module.MessageList })));
const ConversationOverlay = lazy(() => import('./ConversationOverlay/ConversationOverlay').then(module => ({ default: module.ConversationOverlay })));
const ErrorStateHandler = lazy(() => import('@/components/public-report/ErrorStateHandler').then(module => ({ default: module.default })));
const ChatSidebarControls = lazy(() => import('./ChatSidebarControls').then(module => ({ default: module.ChatSidebarControls })));

export const ChatBox = () => {
  const { error } = useChatStore();
  const { uuid } = getChatTokens();
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  // Get error state from report ready store
  const errorState = useReportReadyStore((state) => state.errorState);
  const setErrorState = useReportReadyStore((state) => state.setErrorState);

  useEffect(() => {
    if (uuid) {
      startReportReadyListener(uuid);
    }

    // Cleanup listener on unmount or uuid change
    return () => {
      if (uuid) {
        console.log(`[ChatBox] Cleaning up report ready listener for: ${uuid}`);
        stopReportReadyListener(uuid);
      }
    };
  }, [uuid]);

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
      
      // Stop any active report ready listeners
      if (uuid) {
        stopReportReadyListener(uuid);
      }
      
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
          <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
            <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
              <ChatSidebarControls />
            </Suspense>
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
                <SheetContent side="left" className="w-[85%] sm:max-w-xs p-4">
                  <div className="mb-3">
                    <h2 className="text-lg font-light italic">Settings</h2>
                  </div>
                  <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                    <ChatSidebarControls />
                  </Suspense>
                </SheetContent>
              </Sheet>
              <div className="flex-1" />
            </div>

            {/* Message List - Lazy Loaded */}
            <div className="flex-1 overflow-hidden">
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
      {errorState && (
        <Suspense fallback={null}>
          <ErrorStateHandler
            errorState={errorState}
            onTriggerErrorLogging={handleTriggerErrorLogging}
            onCleanupSession={handleCleanupSession}
          />
        </Suspense>
      )}

      {/* Report Modal is now rendered by the provider */}
    </>
  );
};
