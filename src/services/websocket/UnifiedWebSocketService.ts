// src/services/websocket/UnifiedWebSocketService.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

// Simplified WebSocket service - only for message fetching

class UnifiedWebSocketService {
  private realtimeChannel: any = null;
  private realtimeStatus: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'SUBSCRIBING' | null = null;
  private subscriptionRetryCount: number = 0;
  private currentChatId: string | null = null;

  // Callbacks for message fetching only
  private onMessage?: (message: Message) => void;
  private onError?: (error: string) => void;

  constructor() {
    // No content area watching - only message fetching
  }

  /**
   * Initialize the WebSocket service for message fetching only
   */
  async initialize(chat_id: string, callbacks: {
    onMessage?: (message: Message) => void;
    onError?: (error: string) => void;
  }) {
    this.currentChatId = chat_id;
    this.onMessage = callbacks.onMessage;
    this.onError = callbacks.onError;

    // Clean up existing subscription
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Setup realtime subscription for DB changes
    this.setupRealtimeSubscription(chat_id);
  }

  /**
   * Pause realtime subscription
   */
  pauseRealtimeSubscription() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Resume realtime subscription
   */
  resumeRealtimeSubscription() {
    if (this.currentChatId) {
      this.setupRealtimeSubscription(this.currentChatId);
    }
  }

  /**
   * Send message directly (stub for compatibility)
   */
  sendMessageDirect(text: string, mode?: string) {
    console.warn('[UnifiedWebSocket] sendMessageDirect should be implemented by the actual message sending service');
  }

  /**
   * Set TTS mode (stub for compatibility)
   */
  setTtsMode(enabled: boolean) {
    // This is a stub - TTS mode handling should be done elsewhere
  }

  /**
   * Subscribe to a specific report by report_id
   * Listens to the insights table for when a report is marked as ready
   */
  async subscribeToReport(report_id: string, onReportCompleted: (reportData: any) => void) {
    const reportChannel = supabase
      .channel(`report:${report_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'insights',
          filter: `id=eq.${report_id}`
        },
        (payload) => {
          const insight = payload.new;
          
          // Check if the insight is marked as ready
          if (insight.is_ready === true) {
            console.log(`[UnifiedWebSocket] Report ${report_id} is ready`);
            onReportCompleted(insight);
          }
        }
      )
      .subscribe();

    return reportChannel;
  }

  /**
   * Setup realtime subscription for database changes (message fetching only)
   */
  private setupRealtimeSubscription(chat_id: string) {
    try {
      this.subscriptionRetryCount = 0;

      this.realtimeChannel = supabase
        .channel(`unified-messages:${chat_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chat_id}`
          },
          (payload) => {
            const newMessage = this.transformDatabaseMessage(payload.new);
            console.log('[UnifiedWebSocket] New message received:', newMessage.message_number);
            this.onMessage?.(newMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chat_id}`
          },
          (payload) => {
            const updatedMessage = this.transformDatabaseMessage(payload.new);
            console.log('[UnifiedWebSocket] Message updated:', updatedMessage.id);
            this.onMessage?.(updatedMessage);
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          
          if (status === 'SUBSCRIBED') {
            this.subscriptionRetryCount = 0;
            console.log('[UnifiedWebSocket] Successfully subscribed to messages for chat_id:', chat_id);
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            const retry = Math.min(++this.subscriptionRetryCount, 5);
            const delay = Math.min(1000 * Math.pow(2, retry), 8000);
            console.warn(`[UnifiedWebSocket] Realtime ${status}. Retrying in ${delay}ms (attempt ${retry})`);
            setTimeout(() => {
              this.setupRealtimeSubscription(chat_id);
            }, delay);
          }
        });
    } catch (error) {
      console.error('[UnifiedWebSocket] Failed to setup realtime subscription:', error);
      this.onError?.(error.message || 'Failed to setup WebSocket connection');
    }
  }

  // Message fetching only - no sending methods

  /**
   * Transform database message to UI format
   */
  private transformDatabaseMessage(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      chat_id: dbMessage.chat_id,
      role: dbMessage.role,
      text: dbMessage.text,
      // audioUrl omitted (not present in public.messages)
      // timings omitted (not present / removed)
      createdAt: dbMessage.created_at,
      meta: dbMessage.meta,
      client_msg_id: dbMessage.client_msg_id,
      status: dbMessage.status,
      context_injected: dbMessage.context_injected,
      message_number: dbMessage.message_number
    };
  }

  // Message processing handled by messageStore - WebSocket only fetches

  /**
   * Cleanup WebSocket connection
   */
  cleanup() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.currentChatId = null;
    console.log('[UnifiedWebSocket] Cleaned up WebSocket connection');
  }
}

export const unifiedWebSocketService = new UnifiedWebSocketService();
