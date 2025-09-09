// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ConversationAudioPipeline, encodeWav16kMono } from '@/services/audio/ConversationAudioPipeline';


import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';

class ChatController {
  private conversationServiceInitialized = false;
  private isResetting = false;
  private resetTimeout: NodeJS.Timeout | null = null;
  private isUnlocked = false; // New flag to control microphone access
  private audioPipeline: ConversationAudioPipeline | null = null;
  private isProcessingRef = false;


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

  async sendTextMessage(text: string, mode?: string) {
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: No chat_id in store.');
      return;
    }

    const client_msg_id = uuidv4();
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    // Start listening for assistant message
    // this.startAssistantMessageListener(chat_id); // Removed real-time listener
    
    try {
      const finalMessage = await llmService.sendMessage({ 
        chat_id, 
        text, 
        client_msg_id,
        mode: mode // Pass mode to backend
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

}

export const chatController = new ChatController();
