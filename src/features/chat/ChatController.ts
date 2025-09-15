// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';
// Using unified message store for all message management


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
  // Using unified message store for all message management
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
    
    // Initialize unified WebSocket service
    await unifiedWebSocketService.initialize(chat_id, {
      onMessageReceived: this.handleMessageReceived.bind(this),
      onMessageUpdated: this.handleMessageUpdated.bind(this),
      onStatusChange: this.handleStatusChange.bind(this),
      onOptimisticMessage: this.handleOptimisticMessage.bind(this),
      onAssistantMessage: this.handleAssistantMessageDirect.bind(this)
    });
    
    await this.loadExistingMessages();
  }

  // Heartbeat system
  private dbHeartbeatInterval: NodeJS.Timeout | null = null;
  private readonly DB_HEARTBEAT_INTERVAL = 30000; // 30 seconds

  /**
   * Handle incoming messages from unified WebSocket
   */
  private handleMessageReceived(message: Message) {
    const { messages, updateMessage, addMessage } = useMessageStore.getState();
    
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

  /**
   * Handle message updates from unified WebSocket
   */
  private handleMessageUpdated(message: Message) {
    console.log('[ChatController] ♻️ UPDATE message received from unified WebSocket');
    const { messages, updateMessage, addMessage } = useMessageStore.getState();
    
    // Skip context_injected system updates
    if (message.role === 'assistant' && message.context_injected) {
      return;
    }
    
    // Find existing message and update, or add if missing
    const existingMessage = messages.find(m => m.id === message.id);
    if (existingMessage) {
      updateMessage(message.id, message);
    } else {
      // Message not in store yet, add it
      addMessage(message);
    }
  }

  /**
   * Handle assistant messages directly to UI - no store delay
   */
  private handleAssistantMessageDirect(message: Message) {
    console.log('[ChatController] 🚀 DIRECT assistant message to UI:', message.id);
    
    // Direct UI update - bypass store completely
    // This will trigger immediate TypewriterText animation
    const event = new CustomEvent('assistantMessage', { 
      detail: message 
    });
    window.dispatchEvent(event);

    // Stop button flip-back is now handled in useMessageStore when assistant messages are added
  }

  /**
   * Handle WebSocket status changes
   */
  private handleStatusChange(status: string) {
    if (status === 'SUBSCRIBED') {
      // Start heartbeat for non-TTS mode
      this.startHeartbeat();
    } else if (status === 'CLOSED') {
      console.warn('[ChatController] Unified WebSocket channel closed.');
    }
  }

  /**
   * Handle optimistic messages (immediate UI updates)
   */
  private handleOptimisticMessage(message: Message) {
    const { addMessage } = useMessageStore.getState();
    addMessage(message);
    console.log('[ChatController] Added optimistic message:', message.text);
  }

  private async ensureRealtimeReady(chat_id: string): Promise<void> {
    try {
      // Lightweight ping to wake network/client
      await supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('chat_id', chat_id);
    } catch (error) {
      console.warn('[ChatController] ensureRealtimeReady ping failed (continuing):', error);
    }
  }

  public pauseRealtimeSubscription() {
    unifiedWebSocketService.pauseRealtimeSubscription();
  }

  public resumeRealtimeSubscription() {
    unifiedWebSocketService.resumeRealtimeSubscription();
  }


  /**
   * Initialize conversation (called when modal closes)
   */
  async initializeConversation(chat_id: string): Promise<void> {
    useChatStore.getState().startConversation(chat_id);
    
    // Initialize unified WebSocket service
    await unifiedWebSocketService.initialize(chat_id, {
      onMessageReceived: this.handleMessageReceived.bind(this),
      onMessageUpdated: this.handleMessageUpdated.bind(this),
      onStatusChange: this.handleStatusChange.bind(this),
      onOptimisticMessage: this.handleOptimisticMessage.bind(this),
      onAssistantMessage: this.handleAssistantMessageDirect.bind(this)
    });
    
    this.loadExistingMessages(); // Load conversation history
  }

  // sendTextMessage removed - using unifiedWebSocketService.sendMessageDirect() directly

  // addOptimisticMessages removed - handled by unifiedWebSocketService.sendMessageDirect()

  // REMOVED: scrollToNewTurn - redundant with MessageList auto-scroll


  private initializeConversationService() {
    if (this.conversationServiceInitialized) return;
    
    this.conversationServiceInitialized = true;
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  // Audio pipeline methods removed - using universal mic system
  public async initializeAudioPipeline() {
    // Audio pipeline removed - using universal mic system
    console.log('[ChatController] Audio pipeline removed - using universal mic system');
  }

  // Simple pause/unpause - no turn management needed
  public pauseMic() {
    console.log('[ChatController] pauseMic: Using universal mic system');
  }

  public unpauseMic() {
    console.log('[ChatController] unpauseMic: Using universal mic system');
  }





  public cancelMic() {
    console.log('[ChatController] cancelMic: Using universal mic system');
  }

  public resetConversationService() {
    this.isResetting = true;
  
    // Clear any existing timeouts
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    // Audio pipeline removed - using universal mic system
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
    
    // Clean up unified WebSocket service
    unifiedWebSocketService.cleanup();
    
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
        unifiedWebSocketService.sendMessageDirect(text, mode);
      }, 1000); // Small delay before retry
    }
  }

  /**
   * Payment Flow Control Methods
   */
  public showPaymentFlowProgress(message: string): void {
    const { chat_id } = useChatStore.getState();
    const { addMessage } = useMessageStore.getState();
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

  public setTtsMode(enabled: boolean): void {
    unifiedWebSocketService.setTtsMode(enabled);
    
    if (enabled) {
      this.stopHeartbeat();
    } else {
      // Resume heartbeat after TTS mode ends
      this.startHeartbeat();
    }
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
