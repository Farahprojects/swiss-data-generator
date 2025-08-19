// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { initTtsAudio, stopTtsAudio } from '@/services/voice/ttsAudio';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
// No longer need appendMessage from the client
// import { appendMessage } from '@/services/api/messages';
import { STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER } from '@/config/env';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false; // Flag to prevent race conditions during reset
  
  async initializeConversation(chat_id: string) {
    // FAIL FAST: chat_id is now required and should already be verified by edge function
    if (!chat_id) {
      console.error('[ChatController] initializeConversation: FAIL FAST - chat_id is required');
      throw new Error('chat_id is required for conversation initialization');
    }
    
    console.log('[ChatController] Initializing chat with verified chat_id:', chat_id);
    useChatStore.getState().startConversation(chat_id);
    
    // Load existing messages for this conversation (for page refresh)
    try {
      const existingMessages = await getMessagesForConversation(chat_id);
      
      if (existingMessages.length > 0) {
        console.log('[ChatController] Loaded', existingMessages.length, 'existing messages');
        useChatStore.getState().loadMessages(existingMessages);
      }
    } catch (error) {
      console.error('[ChatController] Error loading existing messages:', error);
      // Don't throw - conversation should still work without history
    }
  }

  async sendTextMessage(text: string) {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: FAIL FAST - No chat_id in store.');
      throw new Error('No conversation established. Cannot send message.');
    }
    
    // Optimistically add user message to UI immediately
    const client_msg_id = uuidv4();
    const tempUserMessage: Message = {
      id: client_msg_id,
      conversationId: chat_id,
      role: 'user' as const,
      text,
      createdAt: new Date().toISOString(),
    };
    useChatStore.getState().addMessage(tempUserMessage);
    
    useChatStore.getState().setStatus('thinking');

    try {
      // Fire-and-forget: chat-send handles user message saving + LLM trigger
      console.log("[ChatController] Sending message via chat-send (fire-and-forget)");
      await llmService.sendMessage({
        chat_id,
        text,
        client_msg_id,
      });
      
      console.log("[ChatController] Message sent successfully - UI updated, backend processing");
      // Note: Assistant response will come via real-time updates or polling

    } catch (error) {
      console.error("[ChatController] Error sending message:", error);
      useChatStore.getState().setError("Failed to send message. Please try again.");
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
    
    let { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] startTurn: FAIL FAST - No chat_id in store. This should be set by useChat hook.');
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
      
      const transcription = await sttService.transcribe(audioBlob, useChatStore.getState().chat_id!, { stt_provider: STT_PROVIDER });

      // ✅ SAFETY CHECK - Only proceed to LLM if we have valid text from STT
      if (!transcription || transcription.trim().length === 0) {
        console.warn('[ChatController] Empty transcription - skipping LLM call and restarting turn');
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
        // Restart the turn automatically for empty transcriptions
        setTimeout(() => this.startTurn(), 500);
        return;
      }

      // Optimistically add user message to UI
      const chat_id = useChatStore.getState().chat_id!;
      const tempUserMessage: Message = {
        id: uuidv4(),
        conversationId: chat_id,
        role: 'user' as const,
        text: transcription,
        audioUrl: URL.createObjectURL(audioBlob),
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(tempUserMessage);

      useChatStore.getState().setStatus('thinking');

      // Fire-and-forget: Let backend handle LLM response
      // STT function already saved the user message, now just trigger LLM
      console.log("[ChatController] Voice message transcribed, triggering LLM (fire-and-forget)");
      
      // For now, we'll use the existing conversation-llm call
      // TODO: Update STT function to trigger LLM directly like chat-send does
      const userMessageForApi = {
        text: transcription,
        meta: { stt_provider: STT_PROVIDER }
      };

      const assistantMessage = await llmService.conversationChat({
        chat_id,
        userMessage: userMessageForApi,
      });

      // Add the final assistant message
      useChatStore.getState().addMessage(assistantMessage);

      // For conversation mode, call TTS and wait for audio to complete
      if (assistantMessage.text && assistantMessage.id) {

        
        useChatStore.getState().setStatus('speaking');
        
        try {
          // Initialize TTS audio system on first use (after user gesture)
          await initTtsAudio();
          
          // Wait for TTS to complete
          await conversationTtsService.speakAssistant({
            conversationId: useChatStore.getState().chat_id!, // Keep interface name for TTS service compatibility
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
