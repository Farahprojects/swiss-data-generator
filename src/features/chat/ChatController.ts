// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { chatTextMicrophoneService } from '@/services/microphone/ChatTextMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';


import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false;
  private turnRestartTimeout: NodeJS.Timeout | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  private isUnlocked = false; // New flag to control microphone access


  constructor() {
    this.loadExistingMessages();
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
    
    useChatStore.getState().startConversation(chat_id);
    this.setupRealtimeSubscription(chat_id);
    await this.loadExistingMessages();
  }

  private realtimeChannel: any = null;

  private setupRealtimeSubscription(chat_id: string) {
    // Clean up existing subscription
    this.cleanupRealtimeSubscription();

    try {
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
            const { messages, updateMessage, addMessage } = useChatStore.getState();
            
            // Reconciliation logic: check if this is updating an optimistic message
            if (newMessage.role === 'user' && newMessage.client_msg_id) {
              // Find and update the optimistic user message
              const optimisticMessage = messages.find(m => m.id === newMessage.client_msg_id);
              if (optimisticMessage) {
                updateMessage(newMessage.client_msg_id, { ...newMessage });
                return;
              }
            }
            
            // Only add if not already present and no reconciliation occurred
            if (!messages.find(m => m.id === newMessage.id)) {
              addMessage(newMessage);
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
          // Realtime subscription status
        });
    } catch (error) {
      console.error('[ChatController] Failed to setup realtime subscription:', error);
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
      status: dbMessage.status
    };
  }

  public cleanupRealtimeSubscription() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
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

  async sendTextMessage(text: string) {
    // 🚫 GUARD: Don't send if conversation overlay is open
    const { useConversationUIStore } = await import('@/features/chat/conversation-ui-store');
    const conversationStore = useConversationUIStore.getState();
    
    if (conversationStore.isConversationOpen) {
      console.log('[ChatController] 🔥 BLOCKED: sendTextMessage - conversation mode active');
      return;
    }
    
    // 🚫 ADDITIONAL GUARD: Check if there's an active conversation overlay in DOM
    const conversationOverlay = document.querySelector('[data-conversation-overlay]');
    if (conversationOverlay) {
      console.log('[ChatController] 🔥 BLOCKED: sendTextMessage - conversation overlay detected in DOM');
      return;
    }

    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: No chat_id in store.');
      return;
    }

    console.log('[ChatController] 🔥 PROCESSING: sendTextMessage - normal chat mode');
    const client_msg_id = uuidv4();
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    // Start listening for assistant message
    // this.startAssistantMessageListener(chat_id); // Removed real-time listener
    
    try {
      const finalMessage = await llmService.sendMessage({ 
        chat_id, 
        text, 
        client_msg_id
      });
      
      // Stop the listener since we got the response
      // this.stopAssistantMessageListener(); // Removed real-time listener
      
      // Assistant response will come via realtime updates
      
    } catch (error) {
      console.error("[ChatController] Error sending message:", error);
      useChatStore.getState().setError("Failed to send message. Please try again.");
      // Stop listener on error
      // this.stopAssistantMessageListener(); // Removed real-time listener
    }
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
    
    chatTextMicrophoneService.initialize({
      onSilenceDetected: () => this.endTurn(),
      silenceTimeoutMs: 1500 // 1.5 seconds for responsive conversation
    });
    
    this.conversationServiceInitialized = true;
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  async startTurn() {
    // Guard: Don't start if conversation overlay is open
    const { useConversationUIStore } = await import('@/features/chat/conversation-ui-store');
    if (useConversationUIStore.getState().isConversationOpen) {
      console.log('[ChatController] 🔥 BLOCKED: startTurn - conversation mode active');
      return;
    }

    console.log('[ChatController] 🔥 PROCESSING: startTurn - normal chat mode');
    if (this.isTurnActive) {
      console.log('[ChatController] Turn already active, skipping startTurn');
      return;
    }

    // ✅ GUARD: Prevent premature microphone activation
    if (!this.isUnlocked) {
      return;
    }



    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] startTurn: No chat_id in store.');
      this.isTurnActive = false;
      return;
    }
    
    this.initializeConversationService();

    useChatStore.getState().setStatus('recording');

    
    try {
      const ok = await chatTextMicrophoneService.startRecording();
      if (!ok) {
        // Fail fast if microphone doesn't start
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
        throw new Error('Failed to start microphone');
      }
      // Reset auto-recovery on successful start
      // conversationFlowMonitor.resetAutoRecovery();
    } catch (error: any) {

      useChatStore.getState().setStatus('idle');
      this.isTurnActive = false;
      useChatStore.getState().setError(error.message);
      throw error; // Re-throw so overlay can catch and handle UI
    }
  }

  async endTurn() {
    // 🚫 GUARD: Don't process if conversation overlay is open
    const { useConversationUIStore } = await import('@/features/chat/conversation-ui-store');
    const conversationStore = useConversationUIStore.getState();
    
    if (conversationStore.isConversationOpen) {
      console.log('[ChatController] endTurn: Blocked - conversation mode active');
      return;
    }
    
    // 🚫 ADDITIONAL GUARD: Check if there's an active conversation overlay in DOM
    if (typeof document !== 'undefined') {
      const conversationOverlay = document.querySelector('[data-conversation-overlay]');
      if (conversationOverlay) {
        console.log('[ChatController] endTurn: Blocked - conversation overlay detected in DOM');
        return;
      }
    }

    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');

    
    try {
      const audioBlob = await chatTextMicrophoneService.stopRecording();
      
      // ✅ ADDED: Validate audio blob before processing
      if (!audioBlob || audioBlob.size === 0) {
        console.warn('[ChatController] Empty audio blob received - restarting turn');
        this.resetTurn(false); // Restart turn to give user another chance
        return;
      }
      
  
      
      const { transcript } = await sttService.transcribe(
        audioBlob, 
        useChatStore.getState().chat_id!
      );

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[ChatController] Empty transcript received - restarting turn');
        this.resetTurn(false); // Restart turn to give user another chance
        return;
      }

      const chat_id = useChatStore.getState().chat_id!;
      const client_msg_id = uuidv4();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.addOptimisticMessages(chat_id, transcript, client_msg_id, audioUrl);
      

      await llmService.sendMessage({ 
        chat_id, 
        text: transcript, 
        client_msg_id
      });
      
      // Assistant response and TTS will be triggered via realtime events
      
      // Reset auto-recovery on successful turn completion
      // conversationFlowMonitor.resetAutoRecovery();

    } catch (error: any) {

      console.error("[ChatController] Error processing voice input:", error);
      useChatStore.getState().setError('Failed to process audio.');
      this.resetTurn();
    }
  }



  private resetTurn(endConversationFlow: boolean = true) {

    
    if (endConversationFlow) {
      useChatStore.getState().setStatus('idle');
    } else {
      // Keep status as 'idle' briefly before starting next turn
      useChatStore.getState().setStatus('idle');
    }
    
    this.isTurnActive = false;
    
    // Clear any existing turn restart timeout
    if (this.turnRestartTimeout) {
      clearTimeout(this.turnRestartTimeout);
      this.turnRestartTimeout = null;
    }
    
    if (endConversationFlow) {
      // End conversation completely - full cleanup
      chatTextMicrophoneService.forceCleanup();
    } else {
      // Turn transition - stop current recording and VAD, but keep stream for next turn
      if (chatTextMicrophoneService.getState().isRecording) {
        chatTextMicrophoneService.stopRecording().catch((error) => {
          // Ignore errors during graceful stop
          console.warn('[ChatController] Graceful stop error (ignored):', error);
        });
      } else {
        // Even if not recording, we need to stop any running VAD loop
        chatTextMicrophoneService.forceCleanup();
      }
    }
    
    if (!endConversationFlow && !this.isResetting) {
      // Short delay before starting next turn
  
      this.turnRestartTimeout = setTimeout(() => { 
        if (!this.isResetting) {
      
          this.startTurn(); 
        }
      }, 500);
    }
  }

    cancelTurn() {
    if (!this.isTurnActive) return;
  
    // Clear any pending timeouts
    if (this.turnRestartTimeout) {
      clearTimeout(this.turnRestartTimeout);
      this.turnRestartTimeout = null;
    }
    
    chatTextMicrophoneService.forceCleanup();
    this.resetTurn(true);
  }

    resetConversationService() {
    this.isResetting = true;
  
    // Clear any existing timeouts
    if (this.turnRestartTimeout) {
      clearTimeout(this.turnRestartTimeout);
      this.turnRestartTimeout = null;
    }
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    chatTextMicrophoneService.forceCleanup();
    this.conversationServiceInitialized = false;
    this.isUnlocked = false; // Lock on reset
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');

    this.resetTimeout = setTimeout(() => {
      this.isResetting = false;
    }, 100);
  }

  // Add cleanup method for component unmount
  cleanup() {
    console.log('[ChatController] 🔥 CLEANUP: Starting ChatController cleanup');
    // Clear all timeouts
    if (this.turnRestartTimeout) {
      clearTimeout(this.turnRestartTimeout);
      this.turnRestartTimeout = null;
    }
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    // Stop any active conversation
    chatTextMicrophoneService.forceCleanup();
    
    // Clean up realtime subscription
    this.cleanupRealtimeSubscription();
    
    this.isResetting = false;
    this.isUnlocked = false; // Lock on cleanup
    console.log('[ChatController] 🔥 CLEANUP: ChatController cleanup complete');
  }

  // Removed private startAssistantMessageListener and stopAssistantMessageListener
}

export const chatController = new ChatController();
