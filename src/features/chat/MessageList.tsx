import React, { useRef, useState, Suspense, lazy } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Button } from '@/components/ui/button';
import { AstroDataPromptMessage } from '@/components/chat/AstroDataPromptMessage';

// Lazy load TypewriterText for better performance
const TypewriterText = lazy(() => import('@/components/ui/TypewriterText').then(module => ({ default: module.TypewriterText })));

interface Turn {
  userMessage?: Message;
  assistantMessage?: Message;
}

const TurnItem = ({ turn, isLastTurn, isFromHistory }: { turn: Turn; isLastTurn: boolean; isFromHistory?: boolean }) => {
  const { userMessage, assistantMessage } = turn;
  const { isConversationOpen } = useConversationUIStore();
  
  // Skip animation for existing messages from history, if it's not the last turn, OR if conversation overlay is open
  const shouldAnimate = assistantMessage && isLastTurn && !isFromHistory && !isConversationOpen;

  return (
    <div 
      className="turn" 
      data-turn-id={userMessage?.id || assistantMessage?.id}
    >
      {/* User Message */}
      {userMessage && (
        <div className="flex items-end gap-3 justify-end mb-4">
          <div className="px-4 py-3 rounded-2xl max-w-[75%] bg-gray-200 text-black">
            <p className="text-base font-light leading-relaxed text-left whitespace-pre-wrap">
              {userMessage.text || ''}
            </p>
          </div>
        </div>
      )}
      
      {/* Assistant Message */}
      {assistantMessage && (
        <div className="flex items-end gap-3 justify-start mb-8">
          <div 
            className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black"
            style={{ overflowAnchor: 'none' }}
          >
            <p className="text-base font-light leading-relaxed text-left">
              <Suspense fallback={<span className="whitespace-pre-wrap">{assistantMessage.text || ''}</span>}>
Well                 <TypewriterText 
                  text={assistantMessage.text || ''} 
                  msPerWord={80}
                  disabled={!shouldAnimate}
                  className="whitespace-pre-wrap"
                />
              </Suspense>
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
    
    // Skip system messages for now
    if (message.role === 'system') continue;
    
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
      }
    }
  }
  
  return turns;
};

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const messageLoadError = useChatStore((state) => state.messageLoadError);
  const retryLoadMessages = useChatStore((state) => state.retryLoadMessages);
  const lastMessagesFetch = useChatStore((state) => state.lastMessagesFetch);
  const chat_id = useChatStore((state) => state.chat_id);
  
  const { containerRef, bottomRef, onContentChange } = useAutoScroll();
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [astroChoiceMade, setAstroChoiceMade] = useState(false);
  
  const handleAddAstroData = () => {
    setAstroChoiceMade(true);
    // TODO: Open astro data form or redirect to report generation
    console.log('User chose to add astro data');
  };

  const handleContinueWithoutAstro = () => {
    setAstroChoiceMade(true);
    // TODO: Initialize chat without astro data
    console.log('User chose to continue without astro data');
  };
  
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
    }
  }, [messages]);

  // Auto-scroll when messages change
  React.useEffect(() => {
    onContentChange();
  }, [messages.length, onContentChange]);
  
  // Group messages into turns
  const turns = groupMessagesIntoTurns(messages);
  
  // Determine which turns are from history
  const getIsFromHistory = (turn: Turn): boolean => {
    if (initialMessageCount === null) return false;
    const messageToCheck = turn.userMessage || turn.assistantMessage;
    if (!messageToCheck) return false;
    const messageIndex = messages.findIndex(m => m.id === messageToCheck.id);
    return messageIndex < initialMessageCount;
  };

  return (
    <div 
      className="chat-scroll-container h-full flex flex-col overflow-y-auto"
      style={{ 
        scrollBehavior: 'smooth'
      }}
      ref={containerRef}
      id="chat-scroll-container"
    >
      {/* Loading state for messages */}
      {isLoadingMessages && messages.length === 0 && (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500 mb-2" />
          <p className="text-gray-500 text-sm">Loading conversation...</p>
        </div>
      )}

      {/* Error state for message loading */}
      {messageLoadError && messages.length === 0 && (
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <AlertTriangle className="h-8 w-8 text-orange-500 mb-2" />
          <p className="text-gray-600 text-center mb-4">
            Failed to load conversation
          </p>
          <p className="text-gray-500 text-sm text-center mb-4">
            {messageLoadError}
          </p>
          <Button 
            onClick={retryLoadMessages}
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
      {!isLoadingMessages && !messageLoadError && (
        <>
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-end">
              <div className="p-4">
                {!astroChoiceMade && !chat_id ? (
                  <AstroDataPromptMessage
                    onAddAstroData={handleAddAstroData}
                    onContinueWithout={handleContinueWithoutAstro}
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Ready to chat! Type your message below.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col p-4">
              {/* Message loading indicator at top if loading additional messages */}
              {isLoadingMessages && messages.length > 0 && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing messages...
                  </div>
                </div>
              )}

              {turns.map((turn, index) => {
                const isFromHistory = getIsFromHistory(turn);
                const isLastTurn = index === turns.length - 1;
                const turnKey = turn.userMessage?.id || turn.assistantMessage?.id || `turn-${index}`;
                
                return (
                  <TurnItem 
                    key={turnKey} 
                    turn={turn}
                    isLastTurn={isLastTurn}
                    isFromHistory={isFromHistory}
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
  );
};
