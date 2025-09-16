import { useEffect, useRef } from 'react';
import { createPaymentFlowOrchestrator, PaymentFlowOrchestrator } from '@/utils/paymentFlowOrchestrator';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useCancelModal } from '@/contexts/CancelModalContext';

interface UsePaymentFlowOptions {
  chatId: string | null;
  enabled: boolean;
}

export const usePaymentFlow = ({ chatId, enabled }: UsePaymentFlowOptions) => {
  const orchestratorRef = useRef<PaymentFlowOrchestrator | null>(null);
  const { showCancelModal } = useCancelModal();
  const { setAssistantTyping } = useChatStore();
  const { setReportReady } = useReportReadyStore();

  useEffect(() => {
    if (!enabled || !chatId) {
      return;
    }

    // Create the orchestrator
    orchestratorRef.current = createPaymentFlowOrchestrator({
      chatId,
      onPaymentConfirmed: () => {
        // Payment confirmed - no state needed
      },
      onReportGenerating: () => {
        setAssistantTyping(true); // Show stop button
      },
      onReportReady: () => {
        setReportReady(true);
        // Stop button will be flipped by system message detection
      },
      onError: (error) => {
        console.error('Payment flow error:', error);
        setAssistantTyping(false); // Hide stop button on error
      },
      onStripeCancel: () => {
        // Reset state on cancellation
        setAssistantTyping(false);
        setReportReady(false);
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
  }, [chatId, enabled, setAssistantTyping, setReportReady]);

  // Reset state when chatId changes
  useEffect(() => {
    if (chatId) {
      setAssistantTyping(false);
      setReportReady(false);
    }
  }, [chatId, setAssistantTyping, setReportReady]);

  return {
    // State (simplified - using chat and report stores)
    isPaymentConfirmed: false, // Not needed anymore
    isReportGenerating: useChatStore.getState().isAssistantTyping, // Use isAssistantTyping
    isReportReady: useReportReadyStore.getState().isReportReady, // Use report store
    error: null, // Not needed anymore
    
    // Actions (simplified)
    reset: () => {
      setAssistantTyping(false);
      setReportReady(false);
    },
  };
};
