import { supabase } from '@/integrations/supabase/client';

interface PaymentPollingOptions {
  chatId: string;
  onPaid: (chatId: string) => void;
  onError: (error: string) => void;
  onTimeout?: () => void;
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
      return;
    }

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
  }

  private async poll(): Promise<void> {
    if (!this.isPolling) return;

    this.attempts++;

    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select('payment_status, report_generated')
        .eq('chat_id', this.options.chatId)
        .single();

      if (error) {
        this.scheduleNextPoll();
        return;
      }

      if (!data) {
        this.options.onError('Guest report not found');
        return;
      }

      if (data.payment_status === 'paid') {
        this.stop();
        this.options.onPaid(this.options.chatId);
        return;
      }

      // Check if we've exceeded max attempts
      if (this.attempts >= this.options.maxAttempts!) {
        this.stop();
        if (this.options.onTimeout) {
          this.options.onTimeout();
        } else {
          this.options.onError('Payment polling timeout');
        }
        return;
      }

      // Schedule next poll
      this.scheduleNextPoll();

    } catch (error) {
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
