import React, { useEffect, useRef, Suspense, lazy, useState } from 'react';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { chatController } from './ChatController';
import { supabase } from '@/integrations/supabase/client';

import { Menu, Sparkles, Settings, User, CreditCard, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getChatTokens } from '@/services/auth/chatTokens';
import { MotionConfig } from 'framer-motion';
import { useConversationUIStore } from './conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { logUserError } from '@/services/errorService';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/settings/UserAvatar';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { ModeDropdown } from '@/components/chat/ModeDropdown';

// Lazy load components for better performance
const MessageList = lazy(() => import('./MessageList').then(module => ({ default: module.MessageList })));
const ConversationOverlay = lazy(() => import('./ConversationOverlay/ConversationOverlay').then(module => ({ default: module.ConversationOverlay })));
const ErrorStateHandler = lazy(() => import('@/components/public-report/ErrorStateHandler').then(module => ({ default: module.default })));
const ChatSidebarControls = lazy(() => import('./ChatSidebarControls').then(module => ({ default: module.ChatSidebarControls })));

// Check if report is already generated for a chat_id
async function checkReportGeneratedStatus(chatId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('guest_reports')
      .select('report_generated')
      .eq('chat_id', chatId)
      .single();
    
    if (error) {
      console.warn(`[ChatBox] Error checking report_generated status:`, error);
      return false; // Default to enabling payment flow if we can't check
    }
    
    return data?.report_generated === true;
  } catch (error) {
    console.warn(`[ChatBox] Error checking report_generated status:`, error);
    return false; // Default to enabling payment flow if we can't check
  }
}

interface ChatBoxProps {
  className?: string;
  onDelete?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onDelete }) => {
  const { error } = useChatStore();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { uuid } = getChatTokens();
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  
  // Get chat_id from store for payment flow
  const { chat_id } = useChatStore();
  
  // Get user type from URL parameters - supports both guest and auth users
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  
  // Determine user type and ID
  const isAuthenticated = !!userId;
  const isGuest = window.location.pathname.startsWith('/c/g/'); // Guest if URL starts with "/c/g/"
  const currentUserId = userId;
  
  // User detection complete - no logging needed
  
  // Initialize payment flow for guest users - only if report not already generated
  const [shouldEnablePaymentFlow, setShouldEnablePaymentFlow] = useState(false);
  
  // Check report_generated status for guest users
  useEffect(() => {
    if (isGuest && chat_id) {
      checkReportGeneratedStatus(chat_id).then((isGenerated) => {
        setShouldEnablePaymentFlow(!isGenerated);
      });
    } else {
      setShouldEnablePaymentFlow(false);
    }
  }, [isGuest, chat_id]);
  
  usePaymentFlow({
    chatId: chat_id,
    enabled: shouldEnablePaymentFlow
  });
  
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
  
  const { openSettings } = useSettingsModal();
  
  // Get error state from report ready store
  const errorState = useReportReadyStore((state) => state.errorState);
  const setErrorState = useReportReadyStore((state) => state.setErrorState);

  const handleOpenSettings = (panel: string) => {
    openSettings(panel as "general" | "account" | "notifications" | "support" | "billing");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };




  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure all listeners are cleaned up when component unmounts
      // Component unmounting, cleaning up all listeners
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
      console.log('[ChatBox] Starting streamlined session cleanup');
      
      try {
        // Clear error state first
        setErrorState(null);
        
        // Use the streamlined reset function
        const { streamlinedSessionReset } = await import('@/utils/streamlinedSessionReset');
        await streamlinedSessionReset({ redirectTo: '/', preserveNavigation: true });
        
        console.log('[ChatBox] Streamlined session cleanup completed');
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
        <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0 mobile-chat-container" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' as any }}>
          {/* Left Sidebar (Desktop) */}
          <div className="hidden md:flex w-64 border-r border-gray-100 flex-col bg-gray-50/50">
            <div className="p-4 h-full flex flex-col">
              
              <div className="flex-1">
                <Suspense fallback={<div className="space-y-4"><div className="h-8 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div><div className="h-6 bg-gray-200 rounded animate-pulse"></div></div>}>
                  <ChatSidebarControls onDelete={onDelete} />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-col flex-1 w-full min-w-0 mobile-chat-container">
            {/* Top Header with Mode Dropdown and User Avatar */}
            <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100">
              <div className="flex items-center">
                <ModeDropdown />
              </div>
              <div className="flex-1" />
              
              {/* User Avatar Dropdown - Top Right */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                      <UserAvatar size="sm" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleOpenSettings('general')}>
                      <Settings className="mr-2 h-4 w-4" />
                      General
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('account')}>
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenSettings('billing')}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSettings('notifications')}>
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

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
                      <ChatSidebarControls onDelete={onDelete} />
                    </Suspense>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="flex-1" />
              
            </div>

            {/* Message List - Lazy Loaded */}
            <div className="flex-1 min-h-0 mobile-messages-area" style={{ overflowAnchor: 'none' as any }}>
              <Suspense fallback={<MessageListSkeleton />}>
                <MessageList />
              </Suspense>
            </div>

            {/* Footer Area (in-flow on mobile to follow keyboard) */}
            <div className="pb-safe mobile-input-area mobile-input-container" style={{ transform: 'none' as any }}>
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
