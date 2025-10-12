import React, { useEffect, useState } from 'react';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';
import { ChatBox } from '@/features/chat/ChatBox';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { useChatInitialization } from '@/hooks/useChatInitialization';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Streamlined ChatContainer - Single Responsibility
 * 
 * Architecture:
 * - URL threadId → useChatInitialization → ChatController → Store → Components
 * - PaymentFlowOrchestrator handles all payment logic and UI
 * - ChatContainer just renders ChatBox when unlocked
 */
const ChatContainerContent: React.FC = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Single responsibility: Initialize chat when threadId changes
  useChatInitialization();
  // Ensure bottom padding accounts for dynamic mobile UI (must run as a hook)
  // useSafeBottomPadding();
  
  // Check for pending join token and open auth modal
  useEffect(() => {
    const pendingToken = localStorage.getItem('pending_join_token');
    if (pendingToken && !user) {
      setShowAuthModal(true);
    }
  }, [user]);

  return (
    <div className="flex flex-col h-screen" style={{ overscrollBehavior: 'contain' as any }}>
      <ReportModalProvider>
        <ChatBox />
      </ReportModalProvider>
      
      {/* Auth modal for pending joins */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
    </div>
  );
};

const ChatContainer: React.FC = () => {
  return <ChatContainerContent />;
};

export default ChatContainer;