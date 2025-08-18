// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { initTtsAudio, stopTtsAudio } from '@/services/voice/ttsAudio';
import { Message } from '@/core/types';
import { STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER } from '@/config/env';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false; // Flag to prevent race conditions during reset
  
  async initializeConversation(conversationId: string) {

    
    // In the new model, conversationId is actually guest uuid
    if (!conversationId) {
      console.error('[ChatController] initializeConversation: FAIL FAST - conversationId is required');
      throw new Error('conversationId is required for conversation initialization');
    }
    

    useChatStore.getState().startConversation(conversationId);
    
    // Messages are now loaded via useChat from guest_reports.messages
  }

  async sendTextMessage(text: string) {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { conversationId } = useChatStore.getState();
    if (!conversationId) {
      console.error('[ChatController] sendTextMessage: FAIL FAST - No conversationId in store. This should be set by useChat hook.');
      throw new Error('No conversation established. Cannot send message.');
    }
    
    useChatStore.getState().setStatus('thinking');

    try {
      const userMessageForApi = {
        text,
        meta: { stt_provider: 'text_input' }
      };

      console.log("[ChatController] Calling LLM service - no optimistic UI");
      const response = await llmService.chat({
        conversationId,
        userMessage: userMessageForApi,
      });
      
      // Trigger message list refresh by updating lastMessageId
      // The actual message content will be fetched from DB
      if (response && typeof response === 'object' && 'queued' in response) {
        // For fire-and-forget responses, we don't get a message ID back
        // Just trigger a refresh after a short delay
        setTimeout(() => {
          const refreshId = Date.now().toString();
          useChatStore.getState().setLastMessageId(refreshId);
          this.persistMessageIdsToSession();
        }, 1000);
      } else {
        console.log("[ChatController] Received response:", response);
        // If we get a message back, use its ID to trigger refresh
        const refreshId = Date.now().toString();
        useChatStore.getState().setLastMessageId(refreshId);
        this.persistMessageIdsToSession();
      }

    } catch (error) {
      console.error("[ChatController] Error during AI turn:", error);
      useChatStore.getState().setError("An error occurred while getting the AI's response.");
    } finally {
      useChatStore.getState().setStatus('idle');
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
    // Set reset flag immediately to prevent race conditions
    this.isResetting = true;
    
    // Force cleanup microphone service
    conversationMicrophoneService.forceCleanup();
    
    // Stop any TTS playback
    stopTtsAudio();
    
    // Reset all flags and state
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');

    // Clear reset flag after a brief delay to ensure all operations see it
    setTimeout(() => {
      this.isResetting = false;
    }, 100);
  }
}

export const chatController = new ChatController();
