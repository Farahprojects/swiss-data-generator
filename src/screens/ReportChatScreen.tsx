// src/screens/ReportChatScreen.tsx
import React from 'react';
import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { useChat } from '@/features/chat/useChat';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { getSessionIds } from '@/services/auth/sessionIds';

class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[ChatErrorBoundary] Caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-sm text-red-700">Something went wrong loading chat. Check console logs for details.</div>;
    }
    return this.props.children as any;
  }
}

const ReportChatScreen = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { guestId } = getSessionIds();

  // Always initialize chat - let ChatBox handle edge cases
  useChat(conversationId, guestId || undefined);

  return (
    <Suspense fallback={null}>
      <MobileViewportLock active>
        <ChatErrorBoundary>
          <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
            <Suspense fallback={null}>
              <ChatBox />
            </Suspense>
          </div>
        </ChatErrorBoundary>
      </MobileViewportLock>
    </Suspense>
  );
};

export default ReportChatScreen;