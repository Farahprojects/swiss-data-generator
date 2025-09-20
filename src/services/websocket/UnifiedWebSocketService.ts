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
  private onSystemMessage?: (message: Message) => void;

  constructor() {
    // No content area watching - only message fetching
  }

  /**
   * Initialize the WebSocket service with callbacks (without subscribing to specific chat)
   * This creates a hot connection that can be used for any chat
   */
  async initializeCallbacks(callbacks?: {
    onMessageReceived?: (message: Message) => void;
    onMessageUpdated?: (message: Message) => void;
    onStatusChange?: (status: string) => void;
    onOptimisticMessage?: (message: Message) => void;
    onAssistantMessage?: (message: Message) => void;
    onSystemMessage?: (message: Message) => void;
  }) {
    
    this.onMessage = callbacks?.onMessageReceived;
    this.onMessageUpdated = callbacks?.onMessageUpdated;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onOptimisticMessage = callbacks?.onOptimisticMessage;
    this.onAssistantMessage = callbacks?.onAssistantMessage;
    this.onSystemMessage = callbacks?.onSystemMessage;
    this.onError = (error: string) => console.error('[UnifiedWebSocket] Error:', error);
    
    console.log('[UnifiedWebSocket] Callbacks initialized, ready for chat subscription');
  }

  /**
   * Initialize the WebSocket service and subscribe to specific chat
   */
  async initialize(
    chat_id: string,
    callbacks?: {
      onMessageReceived?: (message: Message) => void;
      onMessageUpdated?: (message: Message) => void;
      onStatusChange?: (status: string) => void;
      onOptimisticMessage?: (message: Message) => void;
      onAssistantMessage?: (message: Message) => void;
      onSystemMessage?: (message: Message) => void;
    }
  ) {
    // Initialize callbacks first
    await this.initializeCallbacks(callbacks);
    
    // Then subscribe to the specific chat
    await this.subscribeToChat(chat_id);
  }

  /**
   * Pause realtime subscription (stub for compatibility)
   */
  pauseRealtimeSubscription() {
    console.log('[UnifiedWebSocket] pauseRealtimeSubscription: Pausing subscription');
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Resume realtime subscription (stub for compatibility)
   */
  resumeRealtimeSubscription() {
    console.log('[UnifiedWebSocket] resumeRealtimeSubscription: Resuming subscription');
    if (this.currentChatId) {
      this.setupRealtimeSubscription(this.currentChatId);
    }
  }

  /**
   * Send message directly (stub for compatibility)
   */
  sendMessageDirect(text: string, mode?: string) {
    console.log('[UnifiedWebSocket] sendMessageDirect: This is a stub method');
    console.warn('[UnifiedWebSocket] sendMessageDirect should be implemented by the actual message sending service');
  }

  /**
   * Set TTS mode (stub for compatibility)
   */
  setTtsMode(enabled: boolean) {
    // This is a stub - TTS mode handling should be done elsewhere
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

      // Store callbacks in local variables to preserve context
      const onMessageCallback = this.onMessage;
      const onErrorCallback = this.onError;

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
            
            // Filter out system messages at WebSocket level (don't touch store)
            if (newMessage.role === 'system') {
              console.log('[UnifiedWebSocket] System message filtered out from UI');
              
              // Handle system message business logic via callback
              if (this.onSystemMessage && typeof this.onSystemMessage === 'function') {
                this.onSystemMessage(newMessage);
              }
              return; // Don't process further for UI display
            }
            
            // Dispatch pure action to store for user messages only
            if (onMessageCallback && typeof onMessageCallback === 'function') {
              onMessageCallback(newMessage);
            } else {
              console.warn('[UnifiedWebSocket] onMessage callback not set or not a function, message ignored');
            }
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
            if (onMessageCallback && typeof onMessageCallback === 'function') {
              onMessageCallback(updatedMessage);
            } else {
              console.warn('[UnifiedWebSocket] onMessage callback not set or not a function, update ignored');
            }
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          
          if (status === 'SUBSCRIBED') {
            this.subscriptionRetryCount = 0;
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            const retry = Math.min(++this.subscriptionRetryCount, 5);
            const delay = Math.min(1000 * Math.pow(2, retry), 8000);
            console.warn(`[UnifiedWebSocket] Realtime ${status}. Retrying in ${delay}ms (attempt ${retry})`);
            setTimeout(() => {
              if (this.currentChatId === chat_id) {
                this.setupRealtimeSubscription(chat_id);
              }
            }, delay);
          }
        });
    } catch (error) {
      console.error('[UnifiedWebSocket] Failed to setup realtime subscription:', error);
      const onErrorCallback = this.onError;
      if (onErrorCallback && typeof onErrorCallback === 'function') {
        onErrorCallback(error.message || 'Failed to setup WebSocket connection');
      }
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
