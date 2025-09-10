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
  // Single responsibility: Initialize chat when threadId changes
  useChatInitialization();

  return (
    <div className="flex h-screen">
      <PricingProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            <ChatBox />
          </MobileViewportLock>
        </ReportModalProvider>
      </PricingProvider>
    </div>
  );
};

export default ChatContainer;