import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Button } from '@/components/ui/button';
import { AstroDataPromptMessage } from '@/components/chat/AstroDataPromptMessage';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WelcomeBackModal } from '@/components/auth/WelcomeBackModal';
import { useMessages } from '@/hooks/useMessages';

// Typewriter removed: render assistant text immediately with subtle fade/slide

interface Turn {
  userMessage?: Message;
  assistantMessage?: Message;
}

const InlineEllipsis = () => {
  const [dots, setDots] = React.useState('');
  React.useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <span aria-hidden="true">{dots}</span>;
};

const TurnItem = ({ turn, isLastTurn, isFromHistory, directAssistantMessage }: { 
  turn: Turn; 
  isLastTurn: boolean; 
  isFromHistory?: boolean;
  directAssistantMessage?: Message | null;
}) => {
  const { userMessage, assistantMessage } = turn;
  const { isConversationOpen } = useConversationUIStore();
  
  // Use direct assistant message if available, otherwise use turn message
  const displayAssistantMessage = directAssistantMessage || assistantMessage;

  // Subtle fade/slide on first mount only (no typewriter)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className="turn" 
      data-turn-id={userMessage?.id || assistantMessage?.id}
    >
      {/* User Message */}
      {userMessage && (
        <div className="flex items-end gap-3 justify-end mb-4">
          <div className="px-4 py-3 rounded-2xl max-w-[75%] bg-gray-200 text-black">
            <p className="text-base font-light leading-relaxed text-left whitespace-pre-wrap selectable-text">
              {userMessage.text || ''}
            </p>
          </div>
        </div>
      )}
      
      {/* Assistant Message */
      }
      {displayAssistantMessage && (
        <div className="flex items-end gap-3 justify-start mb-8">
          <div 
            className={
              `px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black transition-opacity transition-transform duration-150 ease-out ` +
              (mounted && !isFromHistory && isLastTurn && !isConversationOpen ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0')
            }
            style={{ overflowAnchor: 'none' }}
          >
            <p className="text-base font-light leading-relaxed text-left selectable-text">
              {displayAssistantMessage.meta?.type === 'payment-progress' ? (
                <span className="whitespace-pre-wrap">
                  {(displayAssistantMessage.text || 'Generating your personal space')}
                  <InlineEllipsis />
                </span>
              ) : (
                <span className="whitespace-pre-wrap">
                  {displayAssistantMessage.text || ''}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to group messages into turns (lossless)
const groupMessagesIntoTurns = (messages: Message[]): Turn[] => {
  const turns: Turn[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Handle system messages as standalone turns (but skip context-injected messages)
    if (message.role === 'system') {
      // Skip context-injected messages (they're for the AI, not for display)
      if (message.context_injected) {
        continue;
      }
      turns.push({
        assistantMessage: message // Treat system messages as assistant messages for display
      });
      continue;
    }
    
    if (message.role === 'user') {
      // Look for the next assistant message
      const nextMessage = messages[i + 1];
      const assistantMessage = nextMessage?.role === 'assistant' ? nextMessage : undefined;
      
      turns.push({
        userMessage: message,
        assistantMessage
      });
      
      // Skip the assistant message in the next iteration if we found one
      if (assistantMessage) {
        i++;
      }
    } else if (message.role === 'assistant') {
      // Check if this assistant message was already paired with a user message
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn || lastTurn.assistantMessage) {
        // This is an orphaned assistant message, create a turn for it
        turns.push({
          assistantMessage: message
        });
      } else {
        // This assistant message should be paired with the last user message
        lastTurn.assistantMessage = message;
      }
    }
  }
  
  return turns;
};

export const MessageList = () => {
  const chat_id = useChatStore((state) => state.chat_id);
  // Sliding window from DB + realtime
  const { messages: windowMessages, error: windowError, hasOlder, loadOlder } = useMessages(chat_id, 50);
  
  // Direct assistant message state - bypasses store for immediate UI update
  const [directAssistantMessage, setDirectAssistantMessage] = useState<Message | null>(null);
  
  // Read optimistic user messages from store only (transient, not persisted)
  const optimisticStoreMessages = useChatStore((state) => state.messages);
  
  // Listen for direct assistant messages
  useEffect(() => {
    const handleDirectAssistantMessage = (event: CustomEvent) => {
      const message = event.detail as Message;
      console.log('[MessageList] 🚀 Direct assistant message received:', message.id);
      setDirectAssistantMessage(message);
    };
    
    window.addEventListener('assistantMessage', handleDirectAssistantMessage as EventListener);
    
    return () => {
      window.removeEventListener('assistantMessage', handleDirectAssistantMessage as EventListener);
    };
  }, []);
  
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
  
  // Track initial message count to determine which messages are from history (window-based now)
  React.useEffect(() => {
    if (initialMessageCount === null && windowMessages.length > 0) {
      setInitialMessageCount(windowMessages.length);
    }
  }, [windowMessages.length, initialMessageCount]);

  // Check if user has sent a message (from optimistic store messages)
  React.useEffect(() => {
    const userMessages = optimisticStoreMessages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      setHasUserSentMessage(true);
      // Auto-assume "without" if user starts typing
      if (!astroChoiceMade) {
        setAstroChoiceMade(true);
      }
    }
  }, [optimisticStoreMessages, astroChoiceMade]);

  // Combine window messages with optimistic ones (append optimistic at end)
  const mergedMessages = React.useMemo(() => {
    // 1) Start with DB window (already message_number-ed)
    const db = [...windowMessages];
    // 2) Add optimistic users that aren't in DB yet (by client_msg_id)
    const dbClientIds = new Set(db.map(m => m.client_msg_id));
    const optimisticUsers = optimisticStoreMessages
      .filter(m => m.role === 'user' && !dbClientIds.has(m.client_msg_id));

    // Assign temporary numbers to optimistic users just after current max
    const currentMax = db.reduce((mx, m) => Math.max(mx, m.message_number ?? 0), 0);
    let tempOffset = 1;
    const withTemps = optimisticUsers.map(m => ({ ...m, message_number: currentMax + (tempOffset++) }));

    const all = [...db, ...withTemps];
    // 3) Sort by message_number asc, then createdAt asc, then id
    all.sort((a, b) => {
      const an = a.message_number ?? 0;
      const bn = b.message_number ?? 0;
      if (an !== bn) return an - bn;
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
      return a.id.localeCompare(b.id);
    });
    return all;
  }, [windowMessages, optimisticStoreMessages]);

  // Auto-scroll when merged content grows (DB + optimistic)
  React.useEffect(() => {
    onContentChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedMessages.length]);

  // Auto-scroll once on direct assistant arrival (not on clear)
  React.useEffect(() => {
    if (directAssistantMessage) {
      onContentChange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directAssistantMessage?.id]);

  // Group messages into turns
  const turns = groupMessagesIntoTurns(mergedMessages);
  
  // Determine which turns are from history
  const getIsFromHistory = (turn: Turn): boolean => {
    if (initialMessageCount === null) return false;
    const messageToCheck = turn.userMessage || turn.assistantMessage;
    if (!messageToCheck) return false;
    const messageIndex = mergedMessages.findIndex(m => m.id === messageToCheck.id);
    return messageIndex < initialMessageCount;
  };

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
      {windowError && windowMessages.length === 0 && (
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
          {windowMessages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-end">
              <div className="p-4">
                {!astroChoiceMade && !chat_id ? (
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
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Ready to chat! Type your message below.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col p-4">
              {/* 🚀 LAZY LOAD: No loading indicators - messages load silently */}

              {turns.map((turn, index) => {
                const isFromHistory = getIsFromHistory(turn);
                const isLastTurn = index === turns.length - 1;
                const turnKey = `${turn.userMessage?.id ?? 'u'}-${turn.assistantMessage?.id ?? 'a'}-${index}`;
                
                return (
                  <TurnItem 
                    key={turnKey} 
                    turn={turn}
                    isLastTurn={isLastTurn}
                    isFromHistory={isFromHistory}
                    directAssistantMessage={directAssistantMessage}
                  />
                );
              })}
              
              {/* Bottom padding to prevent content from being hidden behind fixed elements */}
              <div style={{ height: '80px' }} />
              
              {/* Sentinel element for auto-scroll */}
              <div ref={bottomRef} />
            </div>
          )}
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
