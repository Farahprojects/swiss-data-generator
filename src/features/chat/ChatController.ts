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
      // Send message and get immediate assistant response
      console.log("[ChatController] Sending message via chat-send");
      const assistantMessage = await llmService.sendMessage({
        chat_id,
        text,
        client_msg_id,
      });
      
      console.log("[ChatController] Message sent successfully");
      
      // Add assistant response to UI immediately if available
      if (assistantMessage) {
        console.log("[ChatController] Adding assistant response to UI");
        useChatStore.getState().addMessage(assistantMessage);
      }

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
      
      const { transcript, assistantMessage } = await sttService.transcribe(audioBlob, useChatStore.getState().chat_id!, { stt_provider: STT_PROVIDER });

      // If the transcription is empty, the AI part was skipped.
      if (!transcript || transcript.trim().length === 0) {
        console.warn('[ChatController] Empty transcription - ending turn gracefully.');
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
        // Restart the turn automatically for a smoother experience
        setTimeout(() => this.startTurn(), 500);
        return;
      }

      // Optimistically add the user's transcribed message to the UI
      const chat_id = useChatStore.getState().chat_id!;
      const userMessage: Message = {
        id: uuidv4(),
        conversationId: chat_id,
        role: 'user' as const,
        text: transcript,
        audioUrl: URL.createObjectURL(audioBlob),
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(userMessage);

      useChatStore.getState().setStatus('thinking');

      // Now, add the assistant message that we received directly from the STT function
      if (assistantMessage) {
        useChatStore.getState().addMessage(assistantMessage);
        
        // Proceed to play the audio for the assistant's response
        if (assistantMessage.text && assistantMessage.id) {
          useChatStore.getState().setStatus('speaking');
          try {
            await initTtsAudio();
            await conversationTtsService.speakAssistant({
              conversationId: chat_id,
              messageId: assistantMessage.id,
              text: assistantMessage.text
            });
            
            if (this.isResetting) return;
            
            useChatStore.getState().setStatus('idle');
            this.isTurnActive = false;
            
            if (!this.isResetting) {
              this.startTurn();
            }
          } catch (ttsError) {
            console.error('[ChatController] ❌ TTS failed:', ttsError);
            useChatStore.getState().setStatus('idle');
            this.isTurnActive = false;
            if (!this.isResetting) {
              setTimeout(() => { if (!this.isResetting) this.startTurn(); }, 1000);
            }
          }
        } else {
          // If assistant message is missing text or ID, end the turn.
          useChatStore.getState().setStatus('idle');
          this.isTurnActive = false;
        }
      } else {
        // If no assistant message was returned, something went wrong. End the turn.
        console.error('[ChatController] ❌ No assistant message received from STT/LLM pipeline');
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
