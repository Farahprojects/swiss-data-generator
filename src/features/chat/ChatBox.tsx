import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatSidebarControls } from './ChatSidebarControls';
import { getChatTokens } from '@/services/auth/chatTokens';
import { startReportReadyListener, stopReportReadyListener } from '@/services/report/reportReadyListener';
import { MotionConfig } from 'framer-motion';
import { useConversationUIStore } from './conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import ErrorStateHandler from '@/components/public-report/ErrorStateHandler';
import { logUserError } from '@/services/errorService';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    if (errorState?.requires_cleanup) {
      // Clear error state
      setErrorState(null);
      
      // Additional cleanup can be added here if needed
  
    }
  };

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
            <ChatSidebarControls />
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
                  <ChatSidebarControls />
                </SheetContent>
              </Sheet>
              <div className="flex-1" />
            </div>

            {/* Message List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
              <MessageList />
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
            <ConversationOverlay />
          </div>
        </div>
      </MotionConfig>

      {/* Error Handler Popup */}
      {errorState && (
        <ErrorStateHandler
          errorState={errorState}
          onTriggerErrorLogging={handleTriggerErrorLogging}
          onCleanupSession={handleCleanupSession}
        />
      )}

      {/* Report Modal is now rendered by the provider */}
    </>
  );
};
