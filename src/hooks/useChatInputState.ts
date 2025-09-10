import { useSyncExternalStore, useMemo } from 'react';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { usePaymentFlowStore } from '@/stores/paymentFlowStore';

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

  // Subscribe to payment flow store state
  const paymentFlowState = useSyncExternalStore(
    usePaymentFlowStore.subscribe,
    () => usePaymentFlowStore.getState(),
    () => ({
      isPaymentConfirmed: false,
      isReportGenerating: false,
      isReportReady: false,
      error: null,
    })
  );

  // Show stop icon during report generation OR when payment flow stop icon is active
  const isAssistantGenerating = useMemo(() => 
    paymentFlowState.isReportGenerating || chatState.isPaymentFlowStopIcon,
    [paymentFlowState.isReportGenerating, chatState.isPaymentFlowStopIcon]
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
    
    // Payment flow state
    isPaymentConfirmed: paymentFlowState.isPaymentConfirmed,
    isReportGenerating: paymentFlowState.isReportGenerating,
    paymentFlowIsReportReady: paymentFlowState.isReportReady,
    paymentFlowError: paymentFlowState.error,
    
    // Derived state
    isAssistantGenerating,
    isRecording,
  };
};
