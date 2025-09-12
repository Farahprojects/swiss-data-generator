import React from 'react';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';
import { ChatBox } from '@/features/chat/ChatBox';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { CancelModalProvider, useCancelModal } from '@/contexts/CancelModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { useChatInitialization } from '@/hooks/useChatInitialization';
import { CancelNudgeModal } from '@/components/public-report/CancelNudgeModal';

/**
 * Streamlined ChatContainer - Single Responsibility
 * 
 * Architecture:
 * - URL threadId → useChatInitialization → ChatController → Store → Components
 * - PaymentFlowOrchestrator handles all payment logic and UI
 * - ChatContainer just renders ChatBox when unlocked
 */
const ChatContainerContent: React.FC = () => {
  // Single responsibility: Initialize chat when threadId changes
  useChatInitialization();
  // Ensure bottom padding accounts for dynamic mobile UI (must run as a hook)
  useSafeBottomPadding();
  
  const { isOpen, guestId, hideCancelModal } = useCancelModal();

  return (
    <div className="flex h-screen pb-safe">
      <PricingProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            <ChatBox />
          </MobileViewportLock>
        </ReportModalProvider>
      </PricingProvider>
      
      {/* CancelNudgeModal triggered by PaymentFlowOrchestrator */}
      {isOpen && guestId && (
        <CancelNudgeModal
          isOpen={isOpen}
          guestId={guestId}
          onClose={hideCancelModal}
        />
      )}
    </div>
  );
};

const ChatContainer: React.FC = () => {
  return (
    <CancelModalProvider>
      <ChatContainerContent />
    </CancelModalProvider>
  );
};

export default ChatContainer;