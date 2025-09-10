import React from 'react';
import { ChatBox } from '@/features/chat/ChatBox';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { useChatInitialization } from '@/hooks/useChatInitialization';

/**
 * Streamlined ChatContainer - Single Responsibility
 * 
 * Architecture:
 * - URL threadId → useChatInitialization → ChatController → Store → Components
 * - No complex logic, just one moving part
 * - ChatThreadsSidebar handles its own thread management
 * - ChatController handles all chat logic
 */
const ChatContainer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);
  
  // Single responsibility: Initialize chat when threadId changes
  useChatInitialization();

  // Check for cancelled payment status
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus === 'cancelled') {
      setShowCancelledMessage(true);
    }
  }, [searchParams]);

  const handleDismissCancelMessage = () => {
    setShowCancelledMessage(false);
    // Clear the status from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('payment_status');
    window.history.replaceState({}, '', newUrl.toString());
  };

  return (
    <div className="flex h-screen">
      <PricingProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            {/* Show cancelled payment message */}
            {showCancelledMessage && (
              <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Payment Cancelled</p>
                        <p className="text-xs text-amber-700">Your payment was cancelled. You can try again anytime.</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleDismissCancelMessage}
                        className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <ChatBox />
          </MobileViewportLock>
        </ReportModalProvider>
      </PricingProvider>
    </div>
  );
};

export default ChatContainer;