// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
// No longer need appendMessage from the client
// import { appendMessage } from '@/services/api/messages';
import { STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER } from '@/config/env';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  
  async initializeConversation(conversationId: string) {
    console.log('[ChatController] initializeConversation called with conversationId:', conversationId);
    
    // FAIL FAST: conversationId is now required
    if (!conversationId) {
      console.error('[ChatController] initializeConversation: FAIL FAST - conversationId is required');
      throw new Error('conversationId is required for conversation initialization');
    }
    
    console.log('[ChatController] Using existing conversationId:', conversationId);
    useChatStore.getState().startConversation(conversationId);
    
    // Load existing messages for this conversation (for page refresh)
    try {
      console.log('[ChatController] Loading existing messages for conversation:', conversationId);
      const existingMessages = await getMessagesForConversation(conversationId);
      console.log('[ChatController] Found', existingMessages.length, 'existing messages');
      
      if (existingMessages.length > 0) {
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
    
    let { conversationId, messages } = useChatStore.getState();
    if (!conversationId) {
      console.error('[ChatController] sendTextMessage: FAIL FAST - No conversationId in store. This should be set by useChat hook.');
      throw new Error('No conversation established. Cannot send message.');
    }
    
    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: uuidv4(),
      conversationId,
      role: 'user' as const,
      text,
      createdAt: new Date().toISOString(),
    };
    useChatStore.getState().addMessage(tempUserMessage);
    
    useChatStore.getState().setStatus('thinking');

    try {
      const userMessageForApi = {
        text,
        meta: { stt_provider: 'text_input' }
      };

      console.log("[ChatController] Calling new LLM service.");
      const assistantMessage = await llmService.chat({
        conversationId,
        userMessage: userMessageForApi,
      });
      console.log("[ChatController] Received complete assistant message:", assistantMessage);
      
      // Replace temp user message with the real one from the DB later if needed, for now this is fine.
      // We get the final assistant message from the handler.
      useChatStore.getState().addMessage(assistantMessage);

      // For text messages, we don't generate audio automatically
      // Audio can be generated on-demand when user clicks the speaker button

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
    
    // Set up in-memory debug audio handler for STT failures
    sttService.setDebugAudioHandler((audioBlob: Blob, reason: string) => {
      console.log('[ChatController] STT failed - audio will appear in conversation modal');
      // The debug audio will be handled by the DebugAudioContext in the app
      window.dispatchEvent(new CustomEvent('debugAudio', { 
        detail: { blob: audioBlob, reason } 
      }));
    });
    
    conversationMicrophoneService.initialize({
      onSilenceDetected: () => {
        console.log('[ChatController] Silence detected - auto-ending turn');
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
      const transcription = await sttService.transcribe(audioBlob);

      // Optimistically add user message to UI
      const tempUserMessage: Message = {
        id: uuidv4(),
        conversationId: useChatStore.getState().conversationId!,
        role: 'user' as const,
        text: transcription,
        audioUrl: URL.createObjectURL(audioBlob),
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(tempUserMessage);

      useChatStore.getState().setStatus('thinking');

      const userMessageForApi = {
        text: transcription,
        meta: { stt_provider: STT_PROVIDER }
      };

      const assistantMessage = await llmService.conversationChat({
        conversationId: useChatStore.getState().conversationId!,
        userMessage: userMessageForApi,
      });

      // Add the final assistant message
      useChatStore.getState().addMessage(assistantMessage);

      // For conversation mode, audio is always included from combined LLM+TTS
      if (assistantMessage.text && assistantMessage.audioUrl) {
        console.log('[ChatController] Playing conversation audio (LLM+TTS combined)');
        audioPlayer.play(assistantMessage.audioUrl, () => {
          console.log('[ChatController] Conversation audio ended - starting next turn');
          useChatStore.getState().setStatus('idle');
          this.isTurnActive = false;
          // Automatically start next turn for continuous conversation
          this.startTurn();
        });
      } else {
        console.error('[ChatController] Conversation response missing text or audio');
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

  // Reset conversation service when modal is closed
  resetConversationService() {
    conversationMicrophoneService.forceCleanup();
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');
  }
}

export const chatController = new ChatController();
