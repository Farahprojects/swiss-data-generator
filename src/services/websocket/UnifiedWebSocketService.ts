// src/services/websocket/UnifiedWebSocketService.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

// Simplified WebSocket service - only for message fetching

class UnifiedWebSocketService {
  private realtimeChannel: any = null;
  private realtimeStatus: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'SUBSCRIBING' | null = null;
  private subscriptionRetryCount: number = 0;
  private currentChatId: string | null = null;
  private readonly connectTimeoutMs: number = 2000;
  private connectTimeoutId: number | null = null;
  private isColdReconnecting: boolean = false;
  private coldReconnectAttempts: number = 0;
  private wakeListenersAttached: boolean = false;
  private currentConnectionId: string | null = null;

  // Callbacks for message fetching only
  private onMessage?: (message: Message) => void;
  private onMessageUpdated?: (message: Message) => void;
  private onStatusChange?: (status: string) => void;
  private onOptimisticMessage?: (message: Message) => void;
  private onAssistantMessage?: (message: Message) => void;
  private onSystemMessage?: (message: Message) => void;
  private onError?: (error: string) => void;
  private lastCallbacks?: {
    onMessageReceived?: (message: Message) => void;
    onMessageUpdated?: (message: Message) => void;
    onStatusChange?: (status: string) => void;
    onOptimisticMessage?: (message: Message) => void;
    onAssistantMessage?: (message: Message) => void;
    onSystemMessage?: (message: Message) => void;
    onReportCompleted?: (reportData: any) => void;
  };
  
  // Callbacks for report completion events
  private onReportCompleted?: (reportData: any) => void;

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
    onReportCompleted?: (reportData: any) => void;
  }) {
    
    this.lastCallbacks = callbacks;
    this.onMessage = callbacks?.onMessageReceived;
    this.onMessageUpdated = callbacks?.onMessageUpdated;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onOptimisticMessage = callbacks?.onOptimisticMessage;
    this.onAssistantMessage = callbacks?.onAssistantMessage;
    this.onSystemMessage = callbacks?.onSystemMessage;
    this.onReportCompleted = callbacks?.onReportCompleted;
    this.onError = (error: string) => console.error('[UnifiedWebSocket] Error:', error);

    // Attach wake listeners once
    if (!this.wakeListenersAttached) {
      this.wakeListenersAttached = true;
      const wakeReconnect = this.debounce(() => {
        console.log('[UnifiedWebSocket] 🔔 Wake signal received - forcing cold reconnect');
        this.coldReconnect();
      }, 250);

      try {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            wakeReconnect();
          }
        });
      } catch (_) {}
      try {
        window.addEventListener('online', () => {
          wakeReconnect();
        });
      } catch (_) {}
      try {
        window.addEventListener('focus', () => {
          wakeReconnect();
        });
      } catch (_) {}
    }
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
      onReportCompleted?: (reportData: any) => void;
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
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Resume realtime subscription (stub for compatibility)
   */
  resumeRealtimeSubscription() {
    if (this.currentChatId) {
      // Fire-and-forget; caller doesn't require await
      void this.setupRealtimeSubscription(this.currentChatId);
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
    await this.setupRealtimeSubscription(chat_id);

    // Start connection confirmation timer; if not connected, cold reconnect
    this.startConnectConfirmationTimer();
  }

  /**
   * Subscribe to a specific report by report_id
   * Listens to the insights table for when a report is marked as ready
   */
  async subscribeToReport(report_id: string) {
    const reportChannel = supabase
      .channel(`report:${report_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'insights',
          filter: `id=eq.${report_id}` // Listen for updates to this specific insight
        },
        (payload) => {
          const insight = payload.new;
          
          // Check if the insight is marked as ready
          if (insight.is_ready === true) {
            
            if (this.onReportCompleted && typeof this.onReportCompleted === 'function') {
              this.onReportCompleted(insight);
            }
          }
        }
      )
      .subscribe();

    return reportChannel;
  }

  /**
   * Setup realtime subscription for database changes (message fetching only)
   */
  private async setupRealtimeSubscription(chat_id: string) {
    try {
      this.subscriptionRetryCount = 0;

      // Store callbacks in local variables to preserve context
      if (typeof this.onMessage !== 'function') {
        // Ensure callbacks are bound before subscribing
        await this.initializeCallbacks(this.lastCallbacks);
      }
      const onErrorCallback = this.onError;
      const onReportCompletedCallback = this.onReportCompleted;

      // Generate a unique connection id; ignore events from stale channels
      const connectionId = (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2);
      this.currentConnectionId = connectionId;

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
            if (connectionId !== this.currentConnectionId) {
              // Stale channel event - ignore silently
              return;
            }
            const newMessage = this.transformDatabaseMessage(payload.new);
            
            // Filter out system messages at WebSocket level (don't touch store)
            if (newMessage.role === 'system') {
              
              // Handle system message business logic via callback
              if (this.onSystemMessage && typeof this.onSystemMessage === 'function') {
                this.onSystemMessage(newMessage);
              }
              return; // Don't process further for UI display
            }
            
            // Dispatch pure action to store for user messages only
            if (this.onMessage && typeof this.onMessage === 'function') {
              this.onMessage(newMessage);
            } else {
              // No handler bound; skip without noisy logs
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
            if (connectionId !== this.currentConnectionId) {
              return;
            }
            const updatedMessage = this.transformDatabaseMessage(payload.new);
            if (this.onMessage && typeof this.onMessage === 'function') {
              this.onMessage(updatedMessage);
            } else {
              // No handler bound; skip
            }
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          
          if (status === 'SUBSCRIBED') {
            console.log('[UnifiedWebSocket] ✅ SUBSCRIBED successfully');
            this.subscriptionRetryCount = 0;
            this.coldReconnectAttempts = 0;
            if (this.connectTimeoutId !== null) {
              clearTimeout(this.connectTimeoutId);
              this.connectTimeoutId = null;
            }
            if (this.onStatusChange && typeof this.onStatusChange === 'function') {
              this.onStatusChange('CONNECTED');
            }
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn('[UnifiedWebSocket] ⚠️ Connection failed:', status, '- triggering cold reconnect');
            // Simple, professional recovery: cold reconnect once
            this.coldReconnect();
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

  /**
   * Ensure WS is connected; if not, perform a cold reconnect.
   */
  async ensureConnected() {
    if (!this.currentChatId) {
      console.log('[UnifiedWebSocket] ensureConnected: no chat_id, skipping');
      return;
    }
    
    if (this.realtimeStatus !== 'SUBSCRIBED' || !this.realtimeChannel) {
      console.log('[UnifiedWebSocket] ⚠️ Not connected (status:', this.realtimeStatus, 'channel:', !!this.realtimeChannel, ') - triggering cold reconnect');
      await this.coldReconnect();
    } else {
      console.log('[UnifiedWebSocket] ✓ Already connected');
    }
  }

  /**
   * Cold reconnect = teardown + rebind callbacks + resubscribe.
   * Mirrors a lightweight browser refresh for WS stack.
   */
  private async coldReconnect() {
    if (this.isColdReconnecting) return;
    this.isColdReconnecting = true;
    try {
      console.log('[UnifiedWebSocket] 🔄 Cold reconnect starting...');
      if (this.onStatusChange && typeof this.onStatusChange === 'function') {
        this.onStatusChange('REFRESHING');
      }

      // Step 1: Refresh auth session (critical - ensures fresh tokens)
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[UnifiedWebSocket] Auth refresh failed:', error);
        } else {
          console.log('[UnifiedWebSocket] ✓ Auth session refreshed');
        }
      } catch (err) {
        console.error('[UnifiedWebSocket] Auth refresh error:', err);
      }

      // Step 2: Hard teardown - remove old channel and wait for cleanup
      if (this.realtimeChannel) {
        const channelToRemove = this.realtimeChannel;
        this.realtimeChannel = null;
        
        try {
          await supabase.removeChannel(channelToRemove);
          console.log('[UnifiedWebSocket] ✓ Old channel removed');
        } catch (err) {
          console.error('[UnifiedWebSocket] Channel removal error:', err);
        }
        
        // Brief pause to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 3: Re-bind callbacks (refresh closures)
      await this.initializeCallbacks(this.lastCallbacks);
      console.log('[UnifiedWebSocket] ✓ Callbacks rebound');

      // Step 4: Resubscribe if chat is known
      if (this.currentChatId) {
        this.setupRealtimeSubscription(this.currentChatId);
        this.startConnectConfirmationTimer(() => {
          // If still not connected, surface reload recommendation
          console.warn('[UnifiedWebSocket] ⚠️ Cold reconnect failed, reload required');
          if (this.onStatusChange && typeof this.onStatusChange === 'function') {
            this.onStatusChange('RELOAD_REQUIRED');
          }
        });
      }
    } finally {
      this.isColdReconnecting = false;
    }
  }

  /**
   * Start a short timer to confirm connection; if not SUBSCRIBED, cold reconnect.
   */
  private startConnectConfirmationTimer(onTimeout?: () => void) {
    if (this.connectTimeoutId !== null) {
      clearTimeout(this.connectTimeoutId);
    }
    this.connectTimeoutId = window.setTimeout(() => {
      this.connectTimeoutId = null;
      if (this.realtimeStatus !== 'SUBSCRIBED') {
        this.coldReconnectAttempts += 1;
        if (this.coldReconnectAttempts <= 1) {
          this.coldReconnect();
        } else if (onTimeout) {
          onTimeout();
        }
      } else {
        this.coldReconnectAttempts = 0;
      }
    }, this.connectTimeoutMs);
  }

  /**
   * Simple debounce helper to avoid repeated reconnects from multiple wake signals
   */
  private debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
    let t: number | null = null;
    return ((...args: any[]) => {
      if (t !== null) {
        clearTimeout(t);
      }
      t = window.setTimeout(() => {
        t = null;
        fn(...args);
      }, wait);
    }) as T;
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
    if (this.connectTimeoutId !== null) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
  }
}

export const unifiedWebSocketService = new UnifiedWebSocketService();
