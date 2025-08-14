// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { audioRecorder } from '@/services/voice/recorder';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { createConversation } from '@/services/api/conversations';
// No longer need appendMessage from the client
// import { appendMessage } from '@/services/api/messages';
import { STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER } from '@/config/env';

class ChatController {
  private isTurnActive = false;
  
  async initializeConversation(conversationId?: string) {
    console.log('[ChatController] initializeConversation called with conversationId:', conversationId);
    if (conversationId) {
      // Logic to load an existing conversation will go here
      // For now, we'll focus on creating a new one
      console.log('[ChatController] Using existing conversationId:', conversationId);
    } else {
      console.log('[ChatController] No conversationId, calling createConversation()');
      try {
        const newConversation = await createConversation();
        console.log('[ChatController] createConversation succeeded:', newConversation.id);
        useChatStore.getState().startConversation(newConversation.id);
      } catch (error) {
        console.error('[ChatController] createConversation failed:', error);
        throw error; // Re-throw to prevent silent failure
      }
    }
  }

  async sendTextMessage(text: string) {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { conversationId, messages } = useChatStore.getState();
    if (!conversationId) {
      console.log('[ChatController] sendTextMessage: No conversationId, calling createConversation()');
      try {
        const newConversation = await createConversation();
        console.log('[ChatController] sendTextMessage: createConversation succeeded:', newConversation.id);
        conversationId = newConversation.id;
        useChatStore.getState().startConversation(conversationId);
      } catch (error) {
        console.error('[ChatController] sendTextMessage: createConversation failed:', error);
        throw error; // Re-throw to prevent silent failure
      }
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

  async startTurn() {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { conversationId } = useChatStore.getState();
    if (!conversationId) {
      console.log('[ChatController] startTurn: No conversationId, calling createConversation()');
      try {
        const newConversation = await createConversation();
        console.log('[ChatController] startTurn: createConversation succeeded:', newConversation.id);
        conversationId = newConversation.id;
        useChatStore.getState().startConversation(conversationId);
      } catch (error) {
        console.error('[ChatController] startTurn: createConversation failed:', error);
        throw error; // Re-throw to prevent silent failure
      }
    }
    
    useChatStore.getState().setStatus('recording');
    try {
      await audioRecorder.start();
    } catch (error: any) {
      useChatStore.getState().setError(error.message);
      this.isTurnActive = false;
    }
  }

  async endTurn() {
    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');
    try {
      const audioBlob = await audioRecorder.stop();
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

      const assistantMessage = await llmService.chat({
        conversationId: useChatStore.getState().conversationId!,
        userMessage: userMessageForApi,
      });

      // Add the final assistant message
      useChatStore.getState().addMessage(assistantMessage);

      // For voice, we play the audio automatically
      if (assistantMessage.text) {
        const audioUrl = await ttsService.speak(assistantMessage.id, assistantMessage.text);
        // Optionally update the message with the audioUrl
        audioPlayer.play(audioUrl, () => {
          useChatStore.getState().setStatus('idle');
          this.isTurnActive = false;
        });
      } else {
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
    audioRecorder.cancel();
    useChatStore.getState().setStatus('idle');
    this.isTurnActive = false;
  }
}

export const chatController = new ChatController();
