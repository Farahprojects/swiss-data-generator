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
      return;
    }

    // Create the orchestrator
    orchestratorRef.current = createPaymentFlowOrchestrator({
      chatId,
      onPaymentConfirmed: () => {
        setPaymentConfirmed(true);
      },
      onReportGenerating: () => {
        setReportGenerating(true);
      },
      onReportReady: () => {
        setReportReady(true);
        // Don't set setReportGenerating(false) here - let typing completion handle it
      },
      onError: (error) => {
        setError(error);
        setReportGenerating(false);
      },
      onStripeCancel: () => {
        // Reset payment flow state on cancellation
        reset();
      },
      onShowCancelModal: (guestId) => {
        showCancelModal(guestId);
      },
    });

    // Start the orchestrator
    orchestratorRef.current.start();

    // Cleanup function
    return () => {
      if (orchestratorRef.current) {
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
