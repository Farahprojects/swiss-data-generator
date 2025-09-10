import { supabase } from '@/integrations/supabase/client';

interface PaymentPollingOptions {
  chatId: string;
  onPaid: (chatId: string) => void;
  onError: (error: string) => void;
  pollInterval?: number; // milliseconds
  maxAttempts?: number;
}

export class PaymentPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private attempts = 0;
  private isPolling = false;

  constructor(private options: PaymentPollingOptions) {
    this.options.pollInterval = options.pollInterval || 1000; // 1 second default
    this.options.maxAttempts = options.maxAttempts || 30; // 30 seconds default
  }

  start(): void {
    if (this.isPolling) {
      console.warn('[PaymentPoller] Already polling, ignoring start request');
      return;
    }

    console.log(`[PaymentPoller] Starting payment polling for chat_id: ${this.options.chatId}`);
    this.isPolling = true;
    this.attempts = 0;

    this.poll();
  }

  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log(`[PaymentPoller] Stopped payment polling for chat_id: ${this.options.chatId}`);
  }

  private async poll(): Promise<void> {
    if (!this.isPolling) return;

    this.attempts++;
    console.log(`[PaymentPoller] Polling attempt ${this.attempts}/${this.options.maxAttempts} for chat_id: ${this.options.chatId}`);

    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select('payment_status, report_generated')
        .eq('chat_id', this.options.chatId)
        .single();

      if (error) {
        console.error(`[PaymentPoller] Error fetching payment status:`, error);
        this.scheduleNextPoll();
        return;
      }

      if (!data) {
        console.error(`[PaymentPoller] No guest report found for chat_id: ${this.options.chatId}`);
        this.options.onError('Guest report not found');
        return;
      }

      console.log(`[PaymentPoller] Payment status for chat_id ${this.options.chatId}: ${data.payment_status}, report_generated: ${data.report_generated}`);

      if (data.payment_status === 'paid') {
        // Check if report is already generated
        if (data.report_generated === true) {
          console.log(`[PaymentPoller] ✅ Payment confirmed and report already generated for chat_id: ${this.options.chatId} - skipping verify-guest-payment`);
          this.stop();
          this.options.onPaid(this.options.chatId);
          return;
        }

        console.log(`[PaymentPoller] ✅ Payment confirmed for chat_id: ${this.options.chatId} - triggering report generation`);
        this.stop();
        this.options.onPaid(this.options.chatId);
        return;
      }

      // Check if we've exceeded max attempts
      if (this.attempts >= this.options.maxAttempts!) {
        console.error(`[PaymentPoller] ❌ Payment polling timeout for chat_id: ${this.options.chatId}`);
        this.stop();
        this.options.onError('Payment polling timeout');
        return;
      }

      // Schedule next poll
      this.scheduleNextPoll();

    } catch (error) {
      console.error(`[PaymentPoller] Unexpected error:`, error);
      this.scheduleNextPoll();
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isPolling) return;

    this.intervalId = setTimeout(() => {
      this.poll();
    }, this.options.pollInterval);
  }
}

export const createPaymentPoller = (options: PaymentPollingOptions): PaymentPoller => {
  return new PaymentPoller(options);
};
