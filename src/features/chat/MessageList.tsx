import React, { useRef, useState, Suspense, lazy } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { Loader2 } from 'lucide-react';

// Lazy load TypewriterText for better performance
const TypewriterText = lazy(() => import('@/components/ui/TypewriterText').then(module => ({ default: module.TypewriterText })));

interface Turn {
  userMessage: Message;
  assistantMessage?: Message;
}

const TurnItem = ({ turn, isLastTurn, isFromHistory }: { turn: Turn; isLastTurn: boolean; isFromHistory?: boolean }) => {
  const { userMessage, assistantMessage } = turn;
  
  // Skip animation for existing messages from history or if it's not the last turn
  const shouldAnimate = assistantMessage && isLastTurn && !isFromHistory;

  return (
    <div 
      className="turn scroll-snap-align-start" 
      style={{ scrollSnapAlign: 'start', scrollMarginTop: 'var(--header-h, 0px)' }}
      data-turn-id={userMessage.id}
    >
      {/* User Message */}
      <div className="flex items-end gap-3 justify-end mb-4">
        <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl bg-gray-200 text-black">
          <p className="text-base font-light leading-relaxed text-left whitespace-pre-wrap">
            {userMessage.text || ''}
          </p>
        </div>
      </div>
      
      {/* Assistant Message */}
      {assistantMessage && (
        <div className="flex items-end gap-3 justify-start mb-8">
          <div 
            className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black"
            style={{ overflowAnchor: 'none' }}
          >
            <p className="text-base font-light leading-relaxed text-left">
              <Suspense fallback={<span className="whitespace-pre-wrap">{assistantMessage.text || ''}</span>}>
                <TypewriterText 
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

// Temporary message component for "Generating your report..."
const GeneratingReportMessage = () => {
  return (
    <div className="flex items-end gap-3 justify-start mb-8">
      <div 
        className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black"
        style={{ overflowAnchor: 'none' }}
      >
        <div className="flex items-center gap-3 text-base font-light leading-relaxed">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-gray-700">Generating your report...</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to group messages into turns
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
    }
  }
  
  return turns;
};

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);
  
  // Get report generation state
  const isPolling = useReportReadyStore((state) => state.isPolling);
  const isReportReady = useReportReadyStore((state) => state.isReportReady);

  // Track initial message count to determine which messages are from history
  React.useEffect(() => {
    if (initialMessageCount === null && messages.length > 0) {
      setInitialMessageCount(messages.length);
    }
  }, [messages.length, initialMessageCount]);

  // Show generating message when polling and report is not ready
  const showGeneratingMessage = isPolling && !isReportReady;
  
  // Group messages into turns
  const turns = groupMessagesIntoTurns(messages);
  
  // Determine which turns are from history
  const getIsFromHistory = (turn: Turn): boolean => {
    if (initialMessageCount === null) return false;
    const userIndex = messages.findIndex(m => m.id === turn.userMessage.id);
    return userIndex < initialMessageCount;
  };

  return (
    <div 
      className="chat-scroll-container flex flex-col overflow-y-auto"
      style={{ 
        height: '100dvh',
        scrollSnapType: 'y proximity'
      }}
      ref={scrollRef}
      id="chat-scroll-container"
    >
      {messages.length === 0 && !showGeneratingMessage ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <h2 className="text-3xl font-light text-gray-800 text-left">Let's tune into the energy behind your chart</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-4">
          {turns.map((turn, index) => {
            const isFromHistory = getIsFromHistory(turn);
            const isLastTurn = index === turns.length - 1 && !showGeneratingMessage;
            
            return (
              <TurnItem 
                key={turn.userMessage.id} 
                turn={turn}
                isLastTurn={isLastTurn}
                isFromHistory={isFromHistory}
              />
            );
          })}
          
          {/* Show generating message at the end when report is being generated */}
          {showGeneratingMessage && (
            <GeneratingReportMessage />
          )}
          
          {/* Bottom padding to prevent content from being hidden behind fixed elements */}
          <div style={{ height: '120px' }} />
        </div>
      )}
    </div>
  );
};
