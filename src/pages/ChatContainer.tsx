import React from 'react';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';
import { ChatBox } from '@/features/chat/ChatBox';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { useChatInitialization } from '@/hooks/useChatInitialization';

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
  

  return (
    <div className="flex min-h-screen pb-safe" style={{ contain: 'size', overscrollBehavior: 'contain' as any }}>
      <ReportModalProvider>
        <MobileViewportLock active={false}>
          <ChatBox />
        </MobileViewportLock>
      </ReportModalProvider>
    </div>
  );
};

const ChatContainer: React.FC = () => {
  return <ChatContainerContent />;
};

export default ChatContainer;