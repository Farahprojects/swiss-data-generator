import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { Message } from '@/core/types';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Button } from '@/components/ui/button';
import { AstroDataPromptMessage } from '@/components/chat/AstroDataPromptMessage';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WelcomeBackModal } from '@/components/auth/WelcomeBackModal';

// Simple message rendering - no complex turn grouping needed with message_number ordering
const renderMessages = (messages: Message[]) => {
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Skip context-injected system messages
    if (message.role === 'system' && message.context_injected) {
      continue;
    }
    
    // Render user messages
    if (message.role === 'user') {
      elements.push(
        <div key={`user-${message.id}`} className="flex items-end gap-3 justify-end mb-4">
          <div className={`px-4 py-3 rounded-2xl max-w-[75%] text-black ${
            message.pending ? 'bg-gray-300 opacity-75' : 'bg-gray-200'
          }`}>
            <p className="text-base font-light leading-relaxed text-left whitespace-pre-wrap selectable-text">
              {message.text || ''}
            </p>
            {message.pending && (
              <div className="text-xs text-gray-500 mt-1 italic">Sending...</div>
            )}
          </div>
        </div>
      );
    }
    
    // Render assistant messages
    if (message.role === 'assistant') {
      elements.push(
        <div key={`assistant-${message.id}`} className="flex items-end gap-3 justify-start mb-8">
          <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black">
            <p className="text-base font-light leading-relaxed text-left selectable-text">
              <span className="whitespace-pre-wrap">
                {message.text || ''}
              </span>
            </p>
          </div>
        </div>
      );
    }
    
    // Render system messages as assistant messages
    if (message.role === 'system') {
      elements.push(
        <div key={`system-${message.id}`} className="flex items-end gap-3 justify-start mb-8">
          <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black">
            <p className="text-base font-light leading-relaxed text-left selectable-text">
              <span className="whitespace-pre-wrap">
                {message.text || ''}
              </span>
            </p>
          </div>
        </div>
      );
    }
  }
  
  // Unified store handles all messages - no need for direct assistant message logic
  
  return elements;
};

export const MessageList = () => {
  const chat_id = useChatStore((state) => state.chat_id);
  const { mode } = useMode();
  
  // Use unified message store
  const { 
    messages, 
    loading, 
    error: windowError, 
    hasOlder, 
    loadOlder, 
    setChatId 
  } = useMessageStore();
  
  
  // Unified store handles all messages via real-time subscriptions
  
  // Auth detection
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const guestReportId = searchParams.get('guest_id');
  const isAuthenticated = !!user && !!userId;
  const isGuest = !!guestReportId;
  
  const { containerRef, bottomRef, onContentChange } = useAutoScroll();
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [astroChoiceMade, setAstroChoiceMade] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const navigate = useNavigate();
  
  const handleAddAstroData = () => {
    setAstroChoiceMade(true);
    // TODO: Open astro data form or redirect to report generation
    console.log('User chose to add astro data');
  };
  
  // Set chat ID when it changes
  // Removed redundant setChatId call - chat switching already handles this
  // useEffect(() => {
  //   if (chat_id) {
  //     setChatId(chat_id);
  //   }
  // }, [chat_id, setChatId]);

  // Track initial message count to determine which messages are from history
  React.useEffect(() => {
    if (initialMessageCount === null && messages.length > 0) {
      setInitialMessageCount(messages.length);
    }
  }, [messages.length, initialMessageCount]);

  // Check if user has sent a message
  React.useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      setHasUserSentMessage(true);
      // Auto-assume "without" if user starts typing
      if (!astroChoiceMade) {
        setAstroChoiceMade(true);
      }
    }
  }, [messages, astroChoiceMade]);

  // Auto-scroll when content grows
  React.useEffect(() => {
    onContentChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Auto-scroll handled by messages.length changes

  // Render messages directly in message_number order - no complex turn grouping needed

  return (
    <>
    <div 
      className="chat-scroll-container h-full flex flex-col overflow-y-auto"
      style={{ 
        scrollBehavior: 'smooth',
        overflowAnchor: 'none'
      }}
      ref={containerRef}
      id="chat-scroll-container"
    >
      {/* Error state for message loading (window-based) */}
      {windowError && messages.length === 0 && (
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <AlertTriangle className="h-8 w-8 text-orange-500 mb-2" />
          <p className="text-gray-600 text-center mb-4">
            Failed to load conversation
          </p>
          <p className="text-gray-500 text-sm text-center mb-4">
            {windowError}
          </p>
          <Button 
            onClick={loadOlder}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state or content */}
      {!windowError && (
        <>
          {/* Show AstroDataForm when mode is 'astro' (always) OR when no messages and no chat_id */}
          {mode === 'astro' || (messages.length === 0 && !astroChoiceMade && !chat_id) ? (
            <div className="flex-1 flex flex-col justify-end">
              <div className="p-4">
                <div className="w-full max-w-2xl lg:max-w-4xl">
                  <AstroDataForm
                    onClose={() => {
                      // Close form and show auth overlay for guests; authenticated users simply close
                      setAstroChoiceMade(true);
                      if (!isAuthenticated) {
                        setShowWelcomeOverlay(true);
                      }
                    }}
                    onSubmit={(data) => {
                      console.log('Astro data submitted:', data);
                      handleAddAstroData();
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Show messages when mode is 'chat' OR when there are messages */}
          {mode === 'chat' || messages.length > 0 ? (
            <div className="flex flex-col p-4">
              {/* 🚀 LAZY LOAD: No loading indicators - messages load silently */}

              {renderMessages(messages)}
              
              {/* Bottom padding to prevent content from being hidden behind fixed elements */}
              <div style={{ height: '80px' }} />
              
              {/* Sentinel element for auto-scroll */}
              <div ref={bottomRef} />
            </div>
          ) : null}
        </>
      )}
    </div>
    
    {/* Welcome overlay after closing astro form (guests) */}
    <WelcomeBackModal
      isOpen={showWelcomeOverlay}
      onClose={() => setShowWelcomeOverlay(false)}
      onBackToForm={() => setAstroChoiceMade(false)}
    />
    </>
  );
};
