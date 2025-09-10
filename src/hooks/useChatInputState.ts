import { useSyncExternalStore, useMemo } from 'react';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

/**
 * Isolated state management for ChatInput using useSyncExternalStore
 * This prevents unnecessary re-renders from parent component state changes
 */
export const useChatInputState = () => {
  // Subscribe to chat store state
  const chatState = useSyncExternalStore(
    useChatStore.subscribe,
    () => useChatStore.getState(),
    () => useChatStore.getState()
  );

  // Subscribe to report ready store state
  const reportState = useSyncExternalStore(
    useReportReadyStore.subscribe,
    () => useReportReadyStore.getState(),
    () => ({
      isPolling: false,
      isReportReady: false,
    })
  );

  // Subscribe to conversation UI store state
  const conversationState = useSyncExternalStore(
    useConversationUIStore.subscribe,
    () => useConversationUIStore.getState(),
    () => ({
      isConversationOpen: false,
      openConversation: () => {},
      closeConversation: () => {},
    })
  );

  // Memoized derived state to prevent unnecessary recalculations
  const isAssistantGenerating = useMemo(() => 
    reportState.isPolling || 
    chatState.status === 'thinking' || 
    chatState.status === 'transcribing' || 
    chatState.status === 'speaking',
    [reportState.isPolling, chatState.status]
  );

  const isRecording = useMemo(() => 
    chatState.status === 'recording',
    [chatState.status]
  );

  return {
    // Chat state
    status: chatState.status,
    isAssistantTyping: chatState.isAssistantTyping,
    setAssistantTyping: chatState.setAssistantTyping,
    chat_id: chatState.chat_id,
    addThread: chatState.addThread,
    
    // Report state
    isPolling: reportState.isPolling,
    isReportReady: reportState.isReportReady,
    
    // Conversation state
    isConversationOpen: conversationState.isConversationOpen,
    openConversation: conversationState.openConversation,
    closeConversation: conversationState.closeConversation,
    
    // Derived state
    isAssistantGenerating,
    isRecording,
  };
};
