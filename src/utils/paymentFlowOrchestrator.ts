import { createPaymentPoller, PaymentPoller } from './paymentPoller';
import { createReportReadyListener, ReportReadyListener } from './reportReadyListener';
import { supabase } from '@/integrations/supabase/client';
import { chatController } from '@/features/chat/ChatController';

interface PaymentFlowOptions {
  chatId: string;
  onPaymentConfirmed: () => void;
  onReportGenerating: () => void;
  onReportReady: () => void;
  onError: (error: string) => void;
  onStripeCancel?: () => void;
  onShowCancelModal?: (guestId: string) => void;
}

export class PaymentFlowOrchestrator {
  private paymentPoller: PaymentPoller | null = null;
  private reportReadyListener: ReportReadyListener | null = null;
  private isActive = false;

  constructor(private options: PaymentFlowOptions) {}

  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    // Check if this is a Stripe flow by looking for payment_status in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const guestId = urlParams.get('guest_id') || '';
    
    if (paymentStatus === 'cancelled' && guestId) {
      this.handleStripeCancel(guestId);
      return;
    }

    if (paymentStatus === 'success') {
      chatController.showPaymentFlowProgress("Payment confirmed! Setting up your personalized space...");
      // Clean payment-related params from URL without navigation
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('payment_status');
        url.searchParams.delete('guest_id');
        window.history.replaceState({}, '', url.toString());
      } catch { /* noop */ }
    } else {
      // Pre-polling check: look for checkout_url in guest_reports
      await this.checkForStripeAbandonment();
    }

    // Start payment polling
    this.paymentPoller = createPaymentPoller({
      chatId: this.options.chatId,
      onPaid: this.handlePaymentConfirmed.bind(this),
      onError: this.handleError.bind(this),
      onTimeout: this.handlePaymentTimeout.bind(this),
      pollInterval: 1000, // 1 second
      maxAttempts: 8 // 8 seconds for timeout detection
    });

    this.paymentPoller.start();
  }

  stop(): void {
    if (this.paymentPoller) {
      this.paymentPoller.stop();
      this.paymentPoller = null;
    }

    if (this.reportReadyListener) {
      this.reportReadyListener.stop();
      this.reportReadyListener = null;
    }

    this.isActive = false;
  }

  private async handlePaymentConfirmed(chatId: string): Promise<void> {
    // Show inline progress message
    chatController.showPaymentFlowProgress("Payment confirmed! Setting up your personalized space...");
    
    // Notify UI that payment is confirmed
    this.options.onPaymentConfirmed();

    // Trigger report generation
    await this.triggerReportGeneration(chatId);

    // Start listening for report ready signal
    await this.startReportReadyListener(chatId);
  }

  private async triggerReportGeneration(chatId: string): Promise<void> {
    try {
      // First check if report is already generated
      const { data: guestReport, error: checkError } = await supabase
        .from('guest_reports')
        .select('report_generated')
        .eq('chat_id', chatId)
        .single();

      if (checkError) {
        throw new Error(`Failed to check report status: ${checkError.message}`);
      }

      if (guestReport?.report_generated === true) {
        // Show progress and enable stop icon
        chatController.showPaymentFlowProgress("Generating your personal space...");
        chatController.setPaymentFlowStopIcon(true);
        // Notify UI that report is generating (since it's already done)
        this.options.onReportGenerating();
        return;
      }
      
      // Show progress and enable stop icon when injection starts
      chatController.showPaymentFlowProgress("Generating your personal space...");
      chatController.setPaymentFlowStopIcon(true);
      
      const { data, error } = await supabase.functions.invoke('verify-guest-payment', {
        body: { 
          chat_id: chatId,
          type: 'promo' // Since we're focusing on free reports for now
        }
      });

      if (error) {
        throw new Error(`Report generation failed: ${error.message}`);
      }
      
      // Notify UI that report is generating
      this.options.onReportGenerating();
      
    } catch (error) {
      this.handleError('Failed to trigger report generation');
    }
  }

  private async startReportReadyListener(chatId: string): Promise<void> {
    this.reportReadyListener = createReportReadyListener({
      chatId: chatId,
      onReportReady: this.handleReportReady.bind(this),
      onError: this.handleError.bind(this)
    });

    await this.reportReadyListener.start();
  }

  private handleReportReady(chatId: string): void {
    // Remove progress messages and disable stop icon
    chatController.removePaymentFlowProgress();
    chatController.setPaymentFlowStopIcon(false);
    
    // Show completion message
    chatController.showPaymentFlowProgress("Your session is ready!");
    
    // Notify UI that report is ready
    this.options.onReportReady();
    
    // Stop the orchestrator
    this.stop();
  }

  private handleError(error: string): void {
    // Clean up UI state on error
    chatController.removePaymentFlowProgress();
    chatController.setPaymentFlowStopIcon(false);
    
    this.options.onError(error);
    this.stop();
  }

  private async checkForStripeAbandonment(): Promise<void> {
    try {
      // Get guest_id from URL or chat_id
      const urlParams = new URLSearchParams(window.location.search);
      const guestId = urlParams.get('guest_id');
      
      if (!guestId) return;

      // Check if guest_reports has checkout_url (indicates Stripe abandonment)
      const { data: guestReport, error } = await supabase
        .from('guest_reports')
        .select('checkout_url, payment_status')
        .eq('id', guestId)
        .single();

      if (error || !guestReport) return;

      // If there's a checkout_url and payment is still pending, user abandoned Stripe
      if (guestReport.checkout_url && guestReport.payment_status === 'pending') {
        this.handleStripeAbandonment(guestId);
        return;
      }

      // Show normal processing message
      chatController.showPaymentFlowProgress("We're processing your payment. This usually takes a few seconds...");
    } catch (error) {
      // Fallback to normal processing
      chatController.showPaymentFlowProgress("We're processing your payment. This usually takes a few seconds...");
    }
  }

  private handleStripeAbandonment(guestId: string): void {
    // Show abandonment message and offer options
    chatController.showPaymentFlowProgress("No payment detected. Would you like to proceed with Stripe or do you have a promo code?");
    
    // Show CancelNudgeModal with special options
    if (this.options.onShowCancelModal) {
      this.options.onShowCancelModal(guestId);
    }
  }

  private async handlePaymentTimeout(): Promise<void> {
    // After 8 seconds of polling with no payment detected
    const urlParams = new URLSearchParams(window.location.search);
    const guestId = urlParams.get('guest_id');
    
    if (guestId) {
      this.handleStripeAbandonment(guestId);
    } else {
      this.handleError('Payment timeout - no payment detected');
    }
  }

  private handleStripeCancel(guestId: string): void {
    // Show cancellation message in chat
    chatController.showPaymentFlowProgress("Payment was cancelled. You can try again anytime.");
    
    // Clean up URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_status');
    window.history.replaceState({}, '', url.toString());
    
    // Show CancelNudgeModal to allow user to resume checkout
    if (this.options.onShowCancelModal) {
      this.options.onShowCancelModal(guestId);
    }
    
    // Notify UI of cancellation
    if (this.options.onStripeCancel) {
      this.options.onStripeCancel();
    }
    
    // Stop the orchestrator since payment was cancelled
    this.stop();
  }
}

export const createPaymentFlowOrchestrator = (options: PaymentFlowOptions): PaymentFlowOrchestrator => {
  return new PaymentFlowOrchestrator(options);
};
