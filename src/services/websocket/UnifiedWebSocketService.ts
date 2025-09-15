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
   * Initialize the WebSocket service early (without specific chat_id)
   * This creates a hot connection that can be used for any chat
   */
  async initialize(
    onMessage?: (message: Message) => void,
    onError?: (error: string) => void
  ) {
    this.onMessage = onMessage;
    this.onError = onError;

    // Clean up existing subscription
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Connect to Supabase realtime early
    console.log('[UnifiedWebSocket] Connecting to Supabase realtime...');
  }

  /**
   * Subscribe to a specific chat (called when chat_id is known)
   */
  async subscribeToChat(chat_id: string) {
    this.currentChatId = chat_id;
    
    // Clean up existing subscription
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Setup realtime subscription for this specific chat
    this.setupRealtimeSubscription(chat_id);
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
            console.log('[UnifiedWebSocket] Raw payload received:', payload);
            const newMessage = this.transformDatabaseMessage(payload.new);
            console.log('[UnifiedWebSocket] Transformed message:', {
              id: newMessage.id,
              role: newMessage.role,
              message_number: newMessage.message_number,
              text: newMessage.text?.substring(0, 50) + '...'
            });
            console.log('[UnifiedWebSocket] Calling onMessage callback...');
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
            console.log('[UnifiedWebSocket] Successfully subscribed to messages');
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
