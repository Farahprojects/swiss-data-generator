// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { llmService } from '@/services/llm/llmService';
import { initTtsAudio, stopTtsAudio } from '@/services/voice/ttsAudio';
import { getSessionIds } from '@/services/auth/sessionIds';
import { v4 as uuidv4 } from 'uuid';

// This is a conceptual change, assuming llmService.streamChat is called from the UI layer (e.g., MessageList)
// The controller's job is just to create the user message and notify the UI to refresh.
export class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false;
  private currentStreamController: AbortController | null = null;

  async initializeConversation(chatId: string) {
    if (!chatId) {
      console.error('[ChatController] initializeConversation: FAIL FAST - chatId is required');
      return;
    }
    useChatStore.getState().startConversation(chatId);
  }

  async sendTextMessage(text: string) {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    const { guestId, chatId } = getSessionIds();
    console.log('[ChatController] Retrieved session IDs:', { guestId, chatId });

    if (!chatId) {
      console.error('[ChatController] sendTextMessage: No chatId found in session.');
      this.isTurnActive = false;
      return;
    }

    if (!guestId) {
      console.error('[ChatController] sendTextMessage: No guestId found in session.');
      this.isTurnActive = false;
      return;
    }
    
    useChatStore.getState().setStatus('thinking');
    const client_msg_id = uuidv4();

    try {
      // Step 1: Create the user message and wait for it to be in the DB
      const { message_id } = await llmService.createMessage({
        chat_id: chatId,
        text,
        client_msg_id,
      });

      // Step 2: Trigger a refresh. The UI (MessageList) will see the new user message
      // and will automatically start the SSE stream because its dependency `lastMessageId` changes.
      useChatStore.getState().setLastMessageId(message_id);

    } catch (error) {
      console.error("[ChatController] Error during sendTextMessage:", error);
      useChatStore.getState().setError("An error occurred while sending your message.");
    } finally {
      // The status will be managed by the streaming component now
      // useChatStore.getState().setStatus('idle'); 
      this.isTurnActive = false;
    }
  }
  
  async loadConversation(id: string) {
    // This function can be used to load a conversation by its direct ID.
    // I'll implement this properly later if needed.
    console.warn("loadConversation by ID is not fully implemented yet.");
  }

  private initializeConversationService() {
    if (this.conversationServiceInitialized) return;
    
    conversationMicrophoneService.initialize({
      onSilenceDetected: () => {

        this.endTurn();
      },
      silenceTimeoutMs: 2000
    });
    
    this.conversationServiceInitialized = true;
  }

  async startTurn() {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { conversationId } = useChatStore.getState();
    if (!conversationId) {
      console.error('[ChatController] startTurn: FAIL FAST - No conversationId in store. This should be set by useChat hook.');
      throw new Error('No conversation established. Cannot start turn.');
    }
    
    // Initialize conversation service once
    this.initializeConversationService();
    
    useChatStore.getState().setStatus('recording');
    try {
      await conversationMicrophoneService.startRecording();
    } catch (error: any) {
      useChatStore.getState().setError(error.message);
      this.isTurnActive = false;
    }
  }

  async endTurn() {
    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');
    try {
      const audioBlob = await conversationMicrophoneService.stopRecording();
      
      const transcription = await sttService.transcribe(audioBlob, useChatStore.getState().conversationId!, { stt_provider: STT_PROVIDER });

      // ✅ SAFETY CHECK - Only proceed to LLM if we have valid text from STT
      if (!transcription || transcription.trim().length === 0) {
        console.warn('[ChatController] Empty transcription - skipping LLM call and restarting turn');
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
        // Restart the turn automatically for empty transcriptions
        setTimeout(() => this.startTurn(), 500);
        return;
      }

      useChatStore.getState().setStatus('thinking');

      const userMessageForApi = {
        text: transcription,
        meta: { stt_provider: STT_PROVIDER }
      };

      const assistantMessage = await llmService.conversationChat({
        conversationId: useChatStore.getState().conversationId!,
        userMessage: userMessageForApi,
      });

      // Trigger message list refresh - messages will be fetched from DB
      const messageId = assistantMessage.id || Date.now().toString();
      useChatStore.getState().setLastMessageId(messageId);
      this.persistMessageIdsToSession();

      // For conversation mode, call TTS and wait for audio to complete
      if (assistantMessage.text && assistantMessage.id) {

        
        useChatStore.getState().setStatus('speaking');
        
        try {
          // Initialize TTS audio system on first use (after user gesture)
          await initTtsAudio();
          
          // Wait for TTS to complete
          await conversationTtsService.speakAssistant({
            conversationId: useChatStore.getState().conversationId!,
            messageId: assistantMessage.id,
            text: assistantMessage.text
          });
          
          // Check if we're in the middle of a reset (modal closed during audio)
          if (this.isResetting) {
            return;
          }
          

          useChatStore.getState().setStatus('idle');
          this.isTurnActive = false;
          
          // Start next turn after audio completes (only if not resetting)
          if (!this.isResetting) {
            this.startTurn();
          }
          
        } catch (ttsError) {
          console.error('[ChatController] ❌ TTS failed:', ttsError);
          useChatStore.getState().setStatus('idle');
          this.isTurnActive = false;
          
          // Continue conversation even if TTS fails (only if not resetting)
          if (!this.isResetting) {
            setTimeout(() => {
              if (!this.isResetting) {
                this.startTurn();
              }
            }, 1000);
          }
        }
      } else {
        console.error('[ChatController] ❌ Conversation response missing text or ID');
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
      }

    } catch (error: any) {
      console.error("[ChatController] Error processing voice input:", error);
      useChatStore.getState().setError('Failed to process audio.');
      this.isTurnActive = false;
    }
  }

  cancelTurn() {
    if (this.currentStreamController) {
      this.currentStreamController.abort();
      this.currentStreamController = null;
    }
    if (!this.isTurnActive) return;
    conversationMicrophoneService.forceCleanup();
    useChatStore.getState().setStatus('idle');
    this.isTurnActive = false;
  }

  // Persist message IDs to session storage
  private persistMessageIdsToSession() {
    try {
      const { messageIds } = useChatStore.getState();
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('message_ids', JSON.stringify(messageIds));
      }
    } catch (error) {
      console.warn('[ChatController] Failed to persist message IDs to session:', error);
    }
  }

  // BULLETPROOF RESET - Handle all edge cases when modal closes
  resetConversationService() {
    this.isResetting = true;
    this.cancelTurn();
    conversationMicrophoneService.forceCleanup();
    stopTtsAudio();
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');
    setTimeout(() => { this.isResetting = false; }, 100);
  }
}

export const chatController = new ChatController();
