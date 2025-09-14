// src/services/websocket/UnifiedWebSocketService.ts
import { supabase } from '@/integrations/supabase/client';
import { llmService } from '@/services/llm/chat';
import { textStreamService } from '@/services/websocket/TextStreamService';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';

// Content area watching removed - using direct send only

class UnifiedWebSocketService {
  private realtimeChannel: any = null;
  private realtimeStatus: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'SUBSCRIBING' | null = null;
  private subscriptionRetryCount: number = 0;
  // Content watchers removed - using direct send only
  private currentChatId: string | null = null;
  private isTtsMode: boolean = false;
  private messageBuffer: any[] = [];
  private readonly BUFFER_CAPACITY = 100;

  // Callbacks for UI updates
  private onMessageReceived?: (message: Message) => void;
  private onMessageUpdated?: (message: Message) => void;
  private onStatusChange?: (status: string) => void;
  private onOptimisticMessage?: (message: Message) => void;

  constructor() {
    this.setupContentAreaObserver();
  }

  /**
   * Initialize the unified WebSocket service
   */
  async initialize(chat_id: string, callbacks: {
    onMessageReceived?: (message: Message) => void;
    onMessageUpdated?: (message: Message) => void;
    onStatusChange?: (status: string) => void;
    onOptimisticMessage?: (message: Message) => void;
  }) {
    this.currentChatId = chat_id;
    this.onMessageReceived = callbacks.onMessageReceived;
    this.onMessageUpdated = callbacks.onMessageUpdated;
    this.onStatusChange = callbacks.onStatusChange;
    this.onOptimisticMessage = callbacks.onOptimisticMessage;

    // Clean up existing subscription
    this.cleanupRealtimeSubscription();

    // Setup realtime subscription for DB changes
    this.setupRealtimeSubscription(chat_id);

    // Content area watching disabled - using direct send only
  }

  /**
   * Setup realtime subscription for database changes (existing functionality)
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
            
            // Handle message based on TTS mode
            if (this.isTtsMode) {
              this.bufferMessage(newMessage);
            } else {
              this.processMessage(newMessage);
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
            this.onMessageUpdated?.(updatedMessage);
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          this.onStatusChange?.(status);
          
          if (status === 'SUBSCRIBED') {
            this.subscriptionRetryCount = 0;
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
    }
  }

  /**
   * Setup MutationObserver - DISABLED
   * We only use direct send method, no textarea watching
   */
  private setupContentAreaObserver() {
    // Content area watching disabled - using direct send only
    console.log('[UnifiedWebSocket] Content area observer disabled - using direct send only');
  }

  /**
   * Start watching existing content areas - DISABLED
   * We only use direct send method, no textarea listening
   */
  private startContentAreaWatching() {
    // No longer watching textareas - only direct send
    console.log('[UnifiedWebSocket] Content area watching disabled - using direct send only');
  }

  /**
   * Direct send method for immediate fire-and-forget with optimistic UI
   */
  public sendMessageDirect(text: string, mode: string = 'text') {
    if (!this.currentChatId || !text.trim()) return;

    console.log(`[UnifiedWebSocket] Direct send, fire-and-forget:`, text);

    const client_msg_id = uuidv4();
    
    // Show optimistic message immediately in UI
    const optimisticMessage: Message = {
      id: client_msg_id,
      chat_id: this.currentChatId,
      role: 'user',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      status: 'thinking',
      client_msg_id
    };
    
    this.onOptimisticMessage?.(optimisticMessage);
    
    // Send over persistent WS – fail fast on error
    try {
      textStreamService.initialize(this.currentChatId, {
        onDelta: (partial, id) => {
          // Update the optimistic assistant response in-place (append)
          const { messages, updateMessage, addMessage } = (require('@/core/store') as any).useChatStore.getState();
          let assistant = messages.find((m: any) => m.meta?.optimistic_for === client_msg_id);
          if (!assistant) {
            assistant = {
              id: `assistant-${client_msg_id}`,
              chat_id: this.currentChatId,
              role: 'assistant',
              text: partial,
              createdAt: new Date().toISOString(),
              status: 'thinking',
              meta: { optimistic_for: client_msg_id, streamed: true }
            };
            addMessage(assistant);
          } else {
            updateMessage(assistant.id, { ...assistant, text: partial });
          }
        },
        onFinal: (full, id) => {
          const { messages, updateMessage } = (require('@/core/store') as any).useChatStore.getState();
          const assistant = messages.find((m: any) => m.meta?.optimistic_for === client_msg_id);
          if (assistant) {
            updateMessage(assistant.id, { ...assistant, text: full, status: 'done' });
          }
        }
      });
      textStreamService.sendMessage(text.trim(), client_msg_id, mode);
      console.log(`[UnifiedWebSocket] WS send with optimistic UI`);
    } catch (error) {
      console.error('[UnifiedWebSocket] WS send failed (fail-fast):', error);
      throw error;
    }
  }

  /**
   * Transform database message to UI format
   */
  private transformDatabaseMessage(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      chat_id: dbMessage.chat_id,
      role: dbMessage.role,
      text: dbMessage.text,
      audioUrl: dbMessage.audio_url,
      timings: dbMessage.timings,
      createdAt: dbMessage.created_at,
      meta: dbMessage.meta,
      client_msg_id: dbMessage.client_msg_id,
      status: dbMessage.status,
      context_injected: dbMessage.context_injected
    };
  }

  /**
   * Process incoming message from DB
   */
  private processMessage(message: Message) {
    // Skip user messages that we already showed optimistically
    if (message.role === 'user' && message.client_msg_id) {
      console.log(`[UnifiedWebSocket] Skipping user message from DB - already shown optimistically: ${message.client_msg_id}`);
      return;
    }
    
    this.onMessageReceived?.(message);
  }

  /**
   * Buffer message for TTS mode
   */
  private bufferMessage(message: Message) {
    if (this.messageBuffer.length >= this.BUFFER_CAPACITY) {
      const dropped = this.messageBuffer.shift();
      console.warn(`[UnifiedWebSocket] Buffer overflow - dropped message: ${dropped?.id}`);
    }
    this.messageBuffer.push(message);
  }

  /**
   * Set TTS mode (pause/resume DB fetching)
   */
  setTtsMode(enabled: boolean) {
    if (this.isTtsMode === enabled) return;
    
    this.isTtsMode = enabled;
    
    if (enabled) {
      // Pause realtime DB subscription during TTS mode
      this.pauseRealtimeSubscription();
    } else {
      // Resume and flush buffer
      this.flushMessageBuffer();
      this.resumeRealtimeSubscription();
    }
  }

  /**
   * Pause realtime subscription
   */
  pauseRealtimeSubscription() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  /**
   * Resume realtime subscription
   */
  resumeRealtimeSubscription() {
    if (this.realtimeChannel) {
      this.realtimeChannel.subscribe();
    }
  }

  /**
   * Flush message buffer
   */
  private flushMessageBuffer() {
    if (this.messageBuffer.length === 0) return;
    
    this.messageBuffer.forEach(message => {
      this.processMessage(message);
    });
    
    this.messageBuffer = [];
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Clean up realtime subscription
    this.cleanupRealtimeSubscription();
    
    this.currentChatId = null;
    this.messageBuffer = [];
  }

  /**
   * Cleanup realtime subscription
   */
  private cleanupRealtimeSubscription() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.messageBuffer = [];
    this.isTtsMode = false;
  }
}

export const unifiedWebSocketService = new UnifiedWebSocketService();
