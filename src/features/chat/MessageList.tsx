import React, { useRef, useState, Suspense, lazy } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { Loader2 } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';

// Lazy load TypewriterText for better performance
const TypewriterText = lazy(() => import('@/components/ui/TypewriterText').then(module => ({ default: module.TypewriterText })));

interface Turn {
  userMessage: Message;
  assistantMessage?: Message;
}

// Loading sequence messages for report generation
const LOADING_MESSAGES = [
  "Getting Astro data...",
  "Triangulating Starlink...",
  "Calculating planetary positions...",
  "Analyzing cosmic patterns...",
  "AI generating insights...",
  "Finalizing your report..."
];

// Loading sequence component
const ReportLoadingSequence = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  React.useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev < LOADING_MESSAGES.length - 1) {
          return prev + 1;
        } else {
          setIsComplete(true);
          return prev;
        }
      });
    }, 1500); // Change message every 1.5 seconds

    return () => clearInterval(interval);
  }, [isComplete]);

  if (isComplete) return null;

  return (
    <div className="flex items-end gap-3 justify-start mb-8">
      <div 
        className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black"
        style={{ overflowAnchor: 'none' }}
      >
        <p className="text-base font-light leading-relaxed text-left">
          <Suspense fallback={<span className="text-gray-700">{LOADING_MESSAGES[currentMessageIndex]}</span>}>
            <TypewriterText 
              text={LOADING_MESSAGES[currentMessageIndex]} 
              msPerWord={50}
              disabled={false}
              className="text-gray-700"
            />
          </Suspense>
        </p>
      </div>
    </div>
  );
};

const TurnItem = ({ turn, isLastTurn, isFromHistory }: { turn: Turn; isLastTurn: boolean; isFromHistory?: boolean }) => {
  const { userMessage, assistantMessage } = turn;
  
  // Skip animation for existing messages from history or if it's not the last turn
  const shouldAnimate = assistantMessage && isLastTurn && !isFromHistory;

  return (
    <div 
      className="turn" 
      data-turn-id={userMessage.id}
    >
      {/* User Message */}
      <div className="flex items-end gap-3 justify-end mb-4">
        <div className="px-4 py-3 rounded-2xl max-w-[75%] bg-gray-200 text-black">
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

// Message component for "Report is Ready"
const ReportReadyMessage = () => {
  return (
    <div className="flex items-end gap-3 justify-start mb-8">
      <div 
        className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black"
        style={{ overflowAnchor: 'none' }}
      >
        <div className="flex items-center gap-3 text-base font-light leading-relaxed">
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white"></div>
          </div>
          <span className="text-gray-700">Report is Ready</span>
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
  const { containerRef, bottomRef, onContentChange } = useAutoScroll();
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  
  // Get report generation state
  const isPolling = useReportReadyStore((state) => state.isPolling);
  const isReportReady = useReportReadyStore((state) => state.isReportReady);

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

  // Show loading sequence when polling is active and report is not ready yet
  const showLoadingSequence = isPolling && !isReportReady && !hasUserSentMessage;
  
  // Show report ready message when report is ready and user hasn't sent a message yet
  const showReportReadyMessage = isReportReady && !hasUserSentMessage;
  
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
        scrollBehavior: 'smooth'
      }}
      ref={containerRef}
      id="chat-scroll-container"
    >
      {messages.length === 0 && !showReportReadyMessage ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <h2 className="text-3xl font-light text-gray-800 text-left">Let's tune into the energy behind your chart</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-4">
          {turns.map((turn, index) => {
            const isFromHistory = getIsFromHistory(turn);
            const isLastTurn = index === turns.length - 1 && !showReportReadyMessage;
            
            return (
              <TurnItem 
                key={turn.userMessage.id} 
                turn={turn}
                isLastTurn={isLastTurn}
                isFromHistory={isFromHistory}
              />
            );
          })}
          
          {/* Show loading sequence when report is being generated */}
          {showLoadingSequence && (
            <ReportLoadingSequence />
          )}
          
          {/* Show report ready message when report is ready and user hasn't sent a message yet */}
          {showReportReadyMessage && (
            <ReportReadyMessage />
          )}
          
          {/* Bottom padding to prevent content from being hidden behind fixed elements */}
          <div style={{ height: '120px' }} />
          
          {/* Sentinel element for auto-scroll */}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
