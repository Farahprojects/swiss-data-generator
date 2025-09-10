import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ReportReadyListenerOptions {
  chatId: string;
  onReportReady: (chatId: string) => void;
  onError: (error: string) => void;
}

export class ReportReadyListener {
  private channel: RealtimeChannel | null = null;
  private isListening = false;

  constructor(private options: ReportReadyListenerOptions) {}

  start(): void {
    if (this.isListening) {
      console.warn('[ReportReadyListener] Already listening, ignoring start request');
      return;
    }

    console.log(`[ReportReadyListener] Starting WebSocket listener for chat_id: ${this.options.chatId}`);
    this.isListening = true;

    // Create a real-time subscription to report_ready_signals table
    this.channel = supabase
      .channel(`report-ready-${this.options.chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_ready_signals',
          filter: `chat_id=eq.${this.options.chatId}`
        },
        (payload) => {
          console.log(`[ReportReadyListener] ✅ Report ready signal received for chat_id: ${this.options.chatId}`, payload);
          this.handleReportReady(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`[ReportReadyListener] Subscription status: ${status} for chat_id: ${this.options.chatId}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[ReportReadyListener] Successfully subscribed to report_ready_signals for chat_id: ${this.options.chatId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[ReportReadyListener] Channel error for chat_id: ${this.options.chatId}`);
          this.options.onError('WebSocket subscription failed');
        }
      });
  }

  stop(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.isListening = false;
    console.log(`[ReportReadyListener] Stopped WebSocket listener for chat_id: ${this.options.chatId}`);
  }

  private async handleReportReady(signal: any): Promise<void> {
    try {
      console.log(`[ReportReadyListener] Processing report ready signal for chat_id: ${this.options.chatId}`);
      
      // Call context-injector to inject the report data
      await this.injectContext(this.options.chatId);
      
      // Notify the parent that the report is ready
      this.options.onReportReady(this.options.chatId);
      
      // Stop listening since we got the signal
      this.stop();
      
    } catch (error) {
      console.error(`[ReportReadyListener] Error handling report ready signal:`, error);
      this.options.onError('Failed to process report ready signal');
    }
  }

  private async injectContext(chatId: string): Promise<void> {
    try {
      console.log(`[ReportReadyListener] Calling context-injector for chat_id: ${chatId}`);
      
      const { data, error } = await supabase.functions.invoke('context-injector', {
        body: { chat_id: chatId }
      });

      if (error) {
        console.error(`[ReportReadyListener] Context injection failed:`, error);
        throw new Error(`Context injection failed: ${error.message}`);
      }

      console.log(`[ReportReadyListener] ✅ Context injection successful for chat_id: ${chatId}`);
      
    } catch (error) {
      console.error(`[ReportReadyListener] Context injection error:`, error);
      throw error;
    }
  }
}

export const createReportReadyListener = (options: ReportReadyListenerOptions): ReportReadyListener => {
  return new ReportReadyListener(options);
};
