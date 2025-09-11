// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ConversationAudioPipeline, encodeWav16kMono } from '@/services/audio/ConversationAudioPipeline';


import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { networkErrorHandler } from '@/utils/networkErrorHandler';

class ChatController {
  private conversationServiceInitialized = false;
  private isResetting = false;
  private resetTimeout: NodeJS.Timeout | null = null;
  private lastFailedMessage: { text: string; mode?: string } | null = null;
  private isUnlocked = false; // New flag to control microphone access
  private audioPipeline: ConversationAudioPipeline | null = null;
  private isProcessingRef = false;


  constructor() {
    this.loadExistingMessages();
    
    // Listen for network retry events
    window.addEventListener('network-retry', this.handleNetworkRetry.bind(this));
  }

  private async loadExistingMessages(retryCount = 0) {
    const { chat_id, setMessageLoadError, loadMessages } = useChatStore.getState();
    if (!chat_id) return;

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff

    try {
      // 🚀 LAZY LOAD: No loading state, just fetch and load silently
      const messages = await getMessagesForConversation(chat_id);
      loadMessages(messages);
    } catch (error) {
      console.error(`[ChatController] Error loading existing messages (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        setTimeout(() => this.loadExistingMessages(retryCount + 1), retryDelay);
      } else {
        setMessageLoadError(error instanceof Error ? error.message : 'Failed to load messages');
      }
    }
  }

  async initializeForConversation(chat_id: string) {
    if (!chat_id) {
      console.error('[ChatController] initializeForConversation: FAIL FAST - chat_id is required');
      throw new Error('chat_id is required for conversation initialization');
    }
    
    // Set chat_id in store (single source of truth) - this will persist to sessionStorage
    useChatStore.getState().startConversation(chat_id);
    this.setupRealtimeSubscription(chat_id);
    await this.loadExistingMessages();
  }

  private realtimeChannel: any = null;
  private realtimeStatus: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'SUBSCRIBING' | null = null;
  private subscriptionRetryCount: number = 0;
  
  // Buffering system for TTS mode
  private messageBuffer: any[] = [];
  private isTtsMode: boolean = false;
  private readonly BUFFER_CAPACITY = 100; // Circular buffer limit
  
  // Heartbeat system
  private dbHeartbeatInterval: NodeJS.Timeout | null = null;
  private readonly DB_HEARTBEAT_INTERVAL = 30000; // 30 seconds

  private setupRealtimeSubscription(chat_id: string) {
    // Clean up existing subscription
    this.cleanupRealtimeSubscription();

    try {
      this.subscriptionRetryCount = 0;

      this.realtimeChannel = supabase
        .channel(`messages:${chat_id}`)
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
              // Buffer the message when in TTS mode
              this.bufferMessage(newMessage);
            } else {
              // Process immediately when in text mode
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
            console.log('[ChatController] ♻️ UPDATE message payload received');
            const updatedMessage = this.transformDatabaseMessage(payload.new);
            const { messages, updateMessage, addMessage } = useChatStore.getState();
            
            // Skip context_injected system updates
            if (updatedMessage.role === 'assistant' && payload.new.context_injected) {
              return;
            }
            
            // Find existing message and update, or add if missing
            const existingMessage = messages.find(m => m.id === updatedMessage.id);
            if (existingMessage) {
              updateMessage(updatedMessage.id, updatedMessage);
            } else {
              // Message not in store yet, add it
              addMessage(updatedMessage);
            }
          }
        )
        .subscribe((status) => {
          this.realtimeStatus = status as any;
          if (status === 'SUBSCRIBED') {
            // Guaranteed delivery: fetch current state after subscribing
            this.subscriptionRetryCount = 0;
            this.loadExistingMessages();
            this.startHeartbeat();
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            const retry = Math.min(++this.subscriptionRetryCount, 5);
            const delay = Math.min(1000 * Math.pow(2, retry), 8000);
            console.warn(`[ChatController] Realtime ${status}. Retrying subscribe in ${delay}ms (attempt ${retry})`);
            setTimeout(() => {
              // Recreate subscription
              this.setupRealtimeSubscription(chat_id);
            }, delay);
          } else if (status === 'CLOSED') {
            console.warn('[ChatController] Realtime channel closed.');
          }
        });
    } catch (error) {
      console.error('[ChatController] Failed to setup realtime subscription:', error);
    }
  }

  private async ensureRealtimeReady(chat_id: string): Promise<void> {
    try {
      // If no channel or not subscribed, (re)create it
      if (!this.realtimeChannel || this.realtimeStatus !== 'SUBSCRIBED') {
        console.log('[ChatController] ⚠️ Realtime not ready. Reinitializing...');
        this.setupRealtimeSubscription(chat_id);
      }
      // Lightweight ping to wake network/client
      await supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('chat_id', chat_id);
    } catch (error) {
      console.warn('[ChatController] ensureRealtimeReady ping failed (continuing):', error);
    }
  }

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

  public cleanupRealtimeSubscription() {
    this.stopHeartbeat(); // Stop heartbeat when cleaning up
    
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    
    // Clear buffer and reset TTS mode
    this.messageBuffer = [];
    this.isTtsMode = false;
  }

  public pauseRealtimeSubscription() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  public resumeRealtimeSubscription() {
    if (this.realtimeChannel) {
      this.realtimeChannel.subscribe();
    }
  }


  /**
   * Initialize conversation (called when modal closes)
   */
  initializeConversation(chat_id: string): void {
    useChatStore.getState().startConversation(chat_id);
    this.setupRealtimeSubscription(chat_id);
    this.loadExistingMessages(); // Load conversation history
  }

  sendTextMessage(text: string, mode?: string) {
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: No chat_id in store.');
      return;
    }

    // Wake up realtime before sending the user message (fire-and-forget)
    this.ensureRealtimeReady(chat_id).catch((error) => {
      console.warn('[ChatController] Realtime wake-up failed:', error);
    });

    const client_msg_id = uuidv4();
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    // Fire-and-forget: Send message to chat-send (don't await)
    llmService.sendMessage({ 
      chat_id, 
      text, 
      client_msg_id,
      mode: mode // Pass mode to backend
    }).catch((error) => {
      // Store the failed message for retry
      this.lastFailedMessage = { text, mode };
      
      // Use network error handler instead of console.error
      networkErrorHandler.handleError(error, 'ChatController.sendTextMessage');
      useChatStore.getState().setError("Failed to send message. Please try again.");
    });
    
    // Assistant response will come via realtime updates
  }

  private addOptimisticMessages(chat_id: string, text: string, client_msg_id: string, audioUrl?: string) {
    const optimisticUserMessage: Message = {
      id: client_msg_id,
      chat_id: chat_id,
      role: "user",
      text,
      audioUrl,
      createdAt: new Date().toISOString(),
      status: "thinking",
      client_msg_id, // Add client_msg_id for reconciliation
    };

    // Only add the user message optimistically
    // Assistant response will come via realtime updates
    useChatStore.getState().addMessage(optimisticUserMessage);
    
    // Imperative scroll alignment after DOM update
    this.scrollToNewTurn(client_msg_id);
  }

  private scrollToNewTurn(userMessageId: string) {
    // Use double requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.getElementById('chat-scroll-container');
        const turn = document.querySelector(`[data-turn-id="${userMessageId}"]`) as HTMLElement;
        
        if (container && turn) {
          const containerTop = container.offsetTop;
          const turnTop = turn.offsetTop;
          container.scrollTop = turnTop - containerTop;
        }
      });
    });
  }


  private initializeConversationService() {
    if (this.conversationServiceInitialized) return;
    
    this.conversationServiceInitialized = true;
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  public async initializeAudioPipeline() {
    if (this.audioPipeline || !this.isUnlocked) return;
    
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] initializeAudioPipeline: No chat_id in store.');
      return;
    }

    try {
      this.audioPipeline = new ConversationAudioPipeline({
        onSpeechStart: () => {
          useChatStore.getState().setStatus('recording');
        },
        onSpeechSegment: async (pcm: Float32Array) => {
          if (this.isProcessingRef) return;
          this.isProcessingRef = true;
          useChatStore.getState().setStatus('transcribing');
          
          try {
            // Pause mic during STT
            this.pauseMic();
            const wav = encodeWav16kMono(pcm, 16000);
            const { transcript } = await sttService.transcribe(wav, chat_id);
            
            if (transcript && transcript.trim().length > 0) {
              const client_msg_id = uuidv4();
              this.addOptimisticMessages(chat_id, transcript, client_msg_id);
              await llmService.sendMessage({ chat_id, text: transcript, client_msg_id });
            }
          } catch (error) {
            console.error('[ChatController] Error processing voice input:', error);
            useChatStore.getState().setError('Failed to process audio.');
          } finally {
            this.isProcessingRef = false;
            useChatStore.getState().setStatus('idle');
            // Resume mic for next input
            this.unpauseMic();
          }
        },
        onLevel: (level) => {
          // Audio level available for UI animation if needed
          // No React state updates per frame - use refs for smooth animation
        },
        onError: (error: Error) => {
          console.error('[ChatController] Audio pipeline error:', error);
          useChatStore.getState().setError('Audio error occurred.');
        }
      });
      
      await this.audioPipeline.init();
      await this.audioPipeline.start();
      console.log('[ChatController] Audio pipeline initialized successfully');
    } catch (error) {
      console.error('[ChatController] Failed to initialize audio pipeline:', error);
      useChatStore.getState().setError('Failed to initialize microphone.');
    }
  }

  // Simple pause/unpause - no turn management needed
  public pauseMic() {
    console.log('[ChatController] pauseMic: Pausing audio pipeline');
    if (this.audioPipeline) {
      this.audioPipeline.pause();
    }
  }

  public unpauseMic() {
    console.log('[ChatController] unpauseMic: Unpausing audio pipeline');
    if (this.audioPipeline) {
      this.audioPipeline.resume();
    }
  }





  public cancelMic() {
    console.log('[ChatController] cancelMic: Canceling audio pipeline');
    if (this.audioPipeline) {
      this.audioPipeline.dispose();
      this.audioPipeline = null;
    }
  }

  public resetConversationService() {
    this.isResetting = true;
  
    // Clear any existing timeouts
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    // Reset AudioWorklet + WebWorker pipeline
    if (this.audioPipeline) {
      this.audioPipeline.dispose();
      this.audioPipeline = null;
    }
    this.conversationServiceInitialized = false;
    this.isUnlocked = false; // Lock on reset
    this.isProcessingRef = false;
    useChatStore.getState().setStatus('idle');

    this.resetTimeout = setTimeout(() => {
      this.isResetting = false;
    }, 100);
  }

  // Add cleanup method for component unmount
  public cleanup() {
    console.log('[ChatController] 🔥 CLEANUP: Starting ChatController cleanup');
    // Clear all timeouts
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    // Clean up AudioWorklet + WebWorker pipeline
    if (this.audioPipeline) {
      this.audioPipeline.dispose();
      this.audioPipeline = null;
    }
    
    // Clean up realtime subscription
    this.cleanupRealtimeSubscription();
    
    this.isResetting = false;
    this.isUnlocked = false; // Lock on cleanup
    console.log('[ChatController] 🔥 CLEANUP: ChatController cleanup complete');
  }

  /**
   * Handle network retry events from the error popup
   */
  private handleNetworkRetry = (event: CustomEvent) => {
    if (this.lastFailedMessage) {
      console.log('[ChatController] Retrying failed message due to network retry');
      const { text, mode } = this.lastFailedMessage;
      this.lastFailedMessage = null; // Clear the stored message
      
      // Retry sending the message
      setTimeout(() => {
        this.sendTextMessage(text, mode);
      }, 1000); // Small delay before retry
    }
  }

  /**
   * Payment Flow Control Methods
   */
  public showPaymentFlowProgress(message: string): void {
    const { chat_id, addMessage } = useChatStore.getState();
    if (!chat_id) return;

    const progressMessage: Message = {
      id: `payment-progress-${Date.now()}`,
      chat_id: chat_id,
      role: 'system',
      text: message,
      createdAt: new Date().toISOString(),
      status: 'thinking',
      meta: { type: 'payment-progress' }
    };

    addMessage(progressMessage);
    console.log(`[ChatController] Added payment progress message: ${message}`);
  }

  public removePaymentFlowProgress(): void {
    const { messages, removeMessage } = useChatStore.getState();
    
    // Find and remove payment progress messages
    const progressMessages = messages.filter(m => 
      m.meta?.type === 'payment-progress'
    );
    
    progressMessages.forEach(msg => {
      removeMessage(msg.id);
    });
    
    console.log(`[ChatController] Removed ${progressMessages.length} payment progress messages`);
  }

  public setPaymentFlowStopIcon(show: boolean): void {
    const { setPaymentFlowStopIcon } = useChatStore.getState();
    setPaymentFlowStopIcon(show);
    console.log(`[ChatController] Payment flow stop icon: ${show ? 'ON' : 'OFF'}`);
  }

  // Buffering system methods
  private bufferMessage(message: any): void {
    // Circular buffer: if at capacity, remove oldest message
    if (this.messageBuffer.length >= this.BUFFER_CAPACITY) {
      const dropped = this.messageBuffer.shift();
      console.warn(`[ChatController] Buffer overflow - dropped message: ${dropped?.id}`);
    }
    
    this.messageBuffer.push(message);
  }

  private processMessage(message: any): void {
    const { messages, updateMessage, addMessage } = useChatStore.getState();
    
    // Reconciliation logic: check if this is updating an optimistic message
    if (message.role === 'user' && message.client_msg_id) {
      // Find and update the optimistic user message
      const optimisticMessage = messages.find(m => m.id === message.client_msg_id);
      if (optimisticMessage) {
        updateMessage(message.client_msg_id, { ...message });
        return;
      }
    }
    
    // Only add if not already present and no reconciliation occurred
    if (!messages.find(m => m.id === message.id)) {
      addMessage(message);
    }
  }

  public setTtsMode(enabled: boolean): void {
    if (this.isTtsMode === enabled) return;
    
    this.isTtsMode = enabled;
    
    if (enabled) {
    } else {
      this.flushMessageBuffer();
    }
  }

  private flushMessageBuffer(): void {
    if (this.messageBuffer.length === 0) return;
    
    
    // Process all buffered messages
    this.messageBuffer.forEach(message => {
      this.processMessage(message);
    });
    
    // Clear the buffer
    this.messageBuffer = [];
  }

  // Heartbeat system
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.dbHeartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.DB_HEARTBEAT_INTERVAL);
    
  }

  private stopHeartbeat(): void {
    if (this.dbHeartbeatInterval) {
      clearInterval(this.dbHeartbeatInterval);
      this.dbHeartbeatInterval = null;
    }
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      // Lightweight ping to keep connection alive
      const { error } = await supabase
        .from('messages')
        .select('id')
        .limit(1);
      
      if (error) {
        console.warn('[ChatController] Heartbeat failed:', error);
      }
    } catch (error) {
      console.warn('[ChatController] Heartbeat error:', error);
    }
  }

}

export const chatController = new ChatController();
