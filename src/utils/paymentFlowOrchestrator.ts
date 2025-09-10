import { createPaymentPoller, PaymentPoller } from './paymentPoller';
import { createReportReadyListener, ReportReadyListener } from './reportReadyListener';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFlowOptions {
  chatId: string;
  onPaymentConfirmed: () => void;
  onReportGenerating: () => void;
  onReportReady: () => void;
  onError: (error: string) => void;
}

export class PaymentFlowOrchestrator {
  private paymentPoller: PaymentPoller | null = null;
  private reportReadyListener: ReportReadyListener | null = null;
  private isActive = false;

  constructor(private options: PaymentFlowOptions) {}

  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('[PaymentFlowOrchestrator] Already active, ignoring start request');
      return;
    }

    console.log(`[PaymentFlowOrchestrator] Starting payment flow for chat_id: ${this.options.chatId}`);
    this.isActive = true;

    // Start payment polling
    this.paymentPoller = createPaymentPoller({
      chatId: this.options.chatId,
      onPaid: this.handlePaymentConfirmed.bind(this),
      onError: this.handleError.bind(this),
      pollInterval: 1000, // 1 second
      maxAttempts: 30 // 30 seconds
    });

    this.paymentPoller.start();
  }

  stop(): void {
    console.log(`[PaymentFlowOrchestrator] Stopping payment flow for chat_id: ${this.options.chatId}`);
    
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
    console.log(`[PaymentFlowOrchestrator] ✅ Payment confirmed for chat_id: ${chatId}`);
    
    // Notify UI that payment is confirmed
    this.options.onPaymentConfirmed();

    // Trigger report generation
    await this.triggerReportGeneration(chatId);

    // Start listening for report ready signal
    await this.startReportReadyListener(chatId);
  }

  private async triggerReportGeneration(chatId: string): Promise<void> {
    try {
      console.log(`[PaymentFlowOrchestrator] Triggering report generation for chat_id: ${chatId}`);
      
      const { data, error } = await supabase.functions.invoke('verify-guest-payment', {
        body: { 
          chat_id: chatId,
          type: 'promo' // Since we're focusing on free reports for now
        }
      });

      if (error) {
        console.error(`[PaymentFlowOrchestrator] Report generation failed:`, error);
        throw new Error(`Report generation failed: ${error.message}`);
      }

      console.log(`[PaymentFlowOrchestrator] ✅ Report generation triggered successfully for chat_id: ${chatId}`);
      
      // Notify UI that report is generating
      this.options.onReportGenerating();
      
    } catch (error) {
      console.error(`[PaymentFlowOrchestrator] Error triggering report generation:`, error);
      this.handleError('Failed to trigger report generation');
    }
  }

  private async startReportReadyListener(chatId: string): Promise<void> {
    console.log(`[PaymentFlowOrchestrator] Starting report ready listener for chat_id: ${chatId}`);
    
    this.reportReadyListener = createReportReadyListener({
      chatId: chatId,
      onReportReady: this.handleReportReady.bind(this),
      onError: this.handleError.bind(this)
    });

    await this.reportReadyListener.start();
  }

  private handleReportReady(chatId: string): void {
    console.log(`[PaymentFlowOrchestrator] ✅ Report ready for chat_id: ${chatId}`);
    
    // Notify UI that report is ready
    this.options.onReportReady();
    
    // Stop the orchestrator
    this.stop();
  }

  private handleError(error: string): void {
    console.error(`[PaymentFlowOrchestrator] Error: ${error}`);
    this.options.onError(error);
    this.stop();
  }
}

export const createPaymentFlowOrchestrator = (options: PaymentFlowOptions): PaymentFlowOrchestrator => {
  return new PaymentFlowOrchestrator(options);
};
