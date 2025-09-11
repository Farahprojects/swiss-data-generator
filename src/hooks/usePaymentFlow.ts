import { useEffect, useRef } from 'react';
import { usePaymentFlowStore } from '@/stores/paymentFlowStore';
import { createPaymentFlowOrchestrator, PaymentFlowOrchestrator } from '@/utils/paymentFlowOrchestrator';
import { useChatStore } from '@/core/store';
import { useCancelModal } from '@/contexts/CancelModalContext';

interface UsePaymentFlowOptions {
  chatId: string | null;
  enabled: boolean;
}

export const usePaymentFlow = ({ chatId, enabled }: UsePaymentFlowOptions) => {
  const orchestratorRef = useRef<PaymentFlowOrchestrator | null>(null);
  const { showCancelModal } = useCancelModal();
  const {
    setPaymentConfirmed,
    setReportGenerating,
    setReportReady,
    setError,
    reset,
  } = usePaymentFlowStore();

  useEffect(() => {
    if (!enabled || !chatId) {
      console.log(`[usePaymentFlow] Payment flow not enabled or no chatId. enabled: ${enabled}, chatId: ${chatId}`);
      return;
    }

    console.log(`[usePaymentFlow] Starting payment flow for chat_id: ${chatId}`);

    // Create the orchestrator
    orchestratorRef.current = createPaymentFlowOrchestrator({
      chatId,
      onPaymentConfirmed: () => {
        console.log(`[usePaymentFlow] Payment confirmed for chat_id: ${chatId}`);
        setPaymentConfirmed(true);
      },
      onReportGenerating: () => {
        console.log(`[usePaymentFlow] Report generating for chat_id: ${chatId}`);
        setReportGenerating(true);
      },
      onReportReady: () => {
        console.log(`[usePaymentFlow] Report ready for chat_id: ${chatId}`);
        setReportReady(true);
        // Don't set setReportGenerating(false) here - let typing completion handle it
      },
      onError: (error) => {
        console.error(`[usePaymentFlow] Error for chat_id: ${chatId}:`, error);
        setError(error);
        setReportGenerating(false);
      },
      onStripeCancel: () => {
        console.log(`[usePaymentFlow] Stripe payment cancelled for chat_id: ${chatId}`);
        // Reset payment flow state on cancellation
        reset();
      },
      onShowCancelModal: (guestId) => {
        console.log(`[usePaymentFlow] Showing cancel modal for guest_id: ${guestId}`);
        showCancelModal(guestId);
      },
    });

    // Start the orchestrator
    orchestratorRef.current.start();

    // Cleanup function
    return () => {
      if (orchestratorRef.current) {
        console.log(`[usePaymentFlow] Stopping payment flow for chat_id: ${chatId}`);
        orchestratorRef.current.stop();
        orchestratorRef.current = null;
      }
    };
  }, [chatId, enabled, setPaymentConfirmed, setReportGenerating, setReportReady, setError]);

  // Listen for typing completion to stop the stop icon (only for payment flow, not payment flow stop icon)
  const isAssistantTyping = useChatStore(state => state.isAssistantTyping);
  const { isReportGenerating } = usePaymentFlowStore();
  useEffect(() => {
    if (!isAssistantTyping && isReportGenerating) {
      console.log(`[usePaymentFlow] Typing completed, stopping report generating state for chat_id: ${chatId}`);
      setReportGenerating(false);
    }
  }, [isAssistantTyping, isReportGenerating, setReportGenerating, chatId]);

  // Reset state when chatId changes
  useEffect(() => {
    if (chatId) {
      reset();
    }
  }, [chatId, reset]);

  return {
    // State
    isPaymentConfirmed: usePaymentFlowStore.getState().isPaymentConfirmed,
    isReportGenerating: usePaymentFlowStore.getState().isReportGenerating,
    isReportReady: usePaymentFlowStore.getState().isReportReady,
    error: usePaymentFlowStore.getState().error,
    
    // Actions
    reset,
  };
};
