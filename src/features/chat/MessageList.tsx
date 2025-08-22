import React, { useRef, useEffect, useState, Suspense, lazy } from 'react';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { PlayCircle } from 'lucide-react';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useConversationUIStore } from './conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { Loader2 } from 'lucide-react';

// Lazy load TypewriterText for better performance
const TypewriterText = lazy(() => import('@/components/ui/TypewriterText').then(module => ({ default: module.TypewriterText })));

const MessageItem = ({ message, isLast, isFromHistory }: { message: Message; isLast: boolean; isFromHistory?: boolean }) => {
  const isUser = message.role === 'user';
  const isConversationOpen = useConversationUIStore((state) => state.isConversationOpen);
  
  // Skip animation for existing messages from history or if it's not the last message
  // Allow animation during conversation mode for better UX
  const shouldAnimate = !isUser && isLast && !isFromHistory;

  return (
    <div 
      data-message-id={message.id}
      className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-gray-200 text-black max-w-[75%]'
            : 'text-black max-w-2xl lg:max-w-4xl'
        }`}
      >
        <p className="text-base font-light leading-relaxed text-left">
          <Suspense fallback={<span className="whitespace-pre-wrap">{message.text || ''}</span>}>
            <TypewriterText 
              text={message.text || ''} 
              msPerWord={120} // Use the new msPerWord prop
              disabled={!shouldAnimate}
              className="whitespace-pre-wrap"
            />
          </Suspense>
        </p>
        {/* Audio is played live during conversation mode - no stored audio to replay */}
      </div>
    </div>
  );
};

// Temporary message component for "Generating your report..."
const GeneratingReportMessage = () => {
  return (
    <div className="flex items-end gap-3 justify-start">
      <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black">
        <div className="flex items-center gap-3 text-base font-light leading-relaxed">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-gray-700">Generating your report...</span>
        </div>
      </div>
    </div>
  );
};

export const MessageList = () => {
  const messages = useChatStore((state) => state.messages);
  const { scrollToMessageId, setScrollToMessageId } = useChatStore(
    (state) => ({ scrollToMessageId: state.scrollToMessageId, setScrollToMessageId: state.setScrollToMessageId }),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialMessageCount, setInitialMessageCount] = useState<number | null>(null);

  // Get report generation state
  const isPolling = useReportReadyStore((state) => state.isPolling);
  const isReportReady = useReportReadyStore((state) => state.isReportReady);

  // Track initial message count to determine which messages are from history
  useEffect(() => {
    if (initialMessageCount === null && messages.length > 0) {
      setInitialMessageCount(messages.length);
    }
  }, [messages.length, initialMessageCount]);

  // This robust effect handles the "snap-to-top" logic.
  // It watches for a `scrollToMessageId` and ensures the element exists in the DOM before scrolling.
  useEffect(() => {
    if (!scrollToMessageId || !containerRef.current) return;

    const container = containerRef.current;
    let observer: MutationObserver | undefined;

    const scrollAndCleanup = () => {
      const messageElement = container.querySelector(`[data-message-id="${scrollToMessageId}"]`);
      if (messageElement) {
        // Use requestAnimationFrame to sync with the browser's paint cycle for a smooth, jank-free scroll.
        requestAnimationFrame(() => {
          messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
          // Reset the trigger in the store so we don't scroll again.
          setScrollToMessageId(null);
        });
      }
      if (observer) {
        observer.disconnect();
      }
    };

    // First, check if the element is already in the DOM.
    const element = container.querySelector(`[data-message-id="${scrollToMessageId}"]`);
    if (element) {
      scrollAndCleanup();
    } else {
      // If not, set up an observer to watch for when it gets added.
      observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            // Check if our target element has been added.
            const targetAdded = container.querySelector(`[data-message-id="${scrollToMessageId}"]`);
            if (targetAdded) {
              scrollAndCleanup();
              return; // We're done.
            }
          }
        }
      });

      observer.observe(container, { childList: true, subtree: true });
    }

    // Cleanup function to disconnect the observer if the component unmounts or dependencies change.
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [scrollToMessageId, setScrollToMessageId, messages]);

  // Show generating message when polling and report is not ready
  const showGeneratingMessage = isPolling && !isReportReady;

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto">
      {messages.length === 0 && !showGeneratingMessage ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4">
            <h2 className="text-3xl font-light text-gray-800 text-left">Let's tune into the energy behind your chart</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          {messages.map((msg, index) => {
            const isFromHistory = initialMessageCount !== null && index < initialMessageCount;
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                isLast={index === messages.length - 1 && !showGeneratingMessage}
                isFromHistory={isFromHistory}
              />
            );
          })}
          
          {/* Show generating message at the end when report is being generated */}
          {showGeneratingMessage && (
            <GeneratingReportMessage />
          )}
        </div>
      )}
    </div>
  );
};
