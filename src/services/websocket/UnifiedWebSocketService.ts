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

  // No callbacks - just emit events


  constructor() {
    // Attach wake listeners once
    if (!this.wakeListenersAttached) {
      this.wakeListenersAttached = true;
             const wakeReconnect = this.debounce(() => {
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
   * Subscribe to a specific chat - just listen, emit events
   */
  async subscribe(chat_id: string) {
    this.currentChatId = chat_id;
    
    // Clean up existing subscription
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Setup realtime subscription for this specific chat
    await this.setupRealtimeSubscription(chat_id);

    // Start connection confirmation timer
    this.startConnectConfirmationTimer();
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
   * Setup realtime subscription - just listen and emit events
   */
  private async setupRealtimeSubscription(chat_id: string) {
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
            const role = payload.new?.role;
            const messageId = payload.new?.id;
            console.log(`[UnifiedWebSocket] 📥 ${role} message INSERT:`, { 
              chat_id, 
              message_id: messageId,
              text_preview: payload.new?.text?.substring(0, 50)
            });
            
            // Emit global event - no callbacks
            // For both assistant and user messages, notify the store to fetch latest from DB
            console.log(`[UnifiedWebSocket] 🔔 Emitting message event for chat_id:`, chat_id);
            window.dispatchEvent(new CustomEvent('assistant-message', { 
              detail: { chat_id } 
            }));
            console.log(`[UnifiedWebSocket] ✅ Event dispatched`);
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          
                 if (status === 'SUBSCRIBED') {
                   this.subscriptionRetryCount = 0;
            this.coldReconnectAttempts = 0;
            if (this.connectTimeoutId !== null) {
              clearTimeout(this.connectTimeoutId);
              this.connectTimeoutId = null;
            }
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn(`[UnifiedWebSocket] ⚠️ Connection failed:`, status);
            this.coldReconnect();
          }
        });
    } catch (error) {
      console.error('[UnifiedWebSocket] Failed to setup subscription:', error);
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

      // Step 1: Refresh auth session
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[UnifiedWebSocket] Auth refresh failed:', error);
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
               } catch (err) {
          console.error('[UnifiedWebSocket] Channel removal error:', err);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 3: Resubscribe if chat is known
      if (this.currentChatId) {
        await this.setupRealtimeSubscription(this.currentChatId);
        this.startConnectConfirmationTimer(() => {
          console.warn('[UnifiedWebSocket] ⚠️ Cold reconnect failed');
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

  // WebSocket = notification only, DB = source of truth

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
