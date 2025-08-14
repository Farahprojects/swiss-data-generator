// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { audioRecorder } from '@/services/voice/recorder';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { createConversation, getConversationByReportId } from '@/services/api/conversations';
import { appendMessage } from '@/services/api/messages';
import { STT_PROVIDER, LLM_PROVIDER, TTS_PROVIDER } from '@/config/env';

class ChatController {
  private isTurnActive = false;
  
  async initializeConversation(conversationId?: string) {
    if (conversationId) {
      // Logic to load an existing conversation will go here
      // For now, we'll focus on creating a new one
    } else {
      const newConversation = await createConversation();
      useChatStore.getState().startConversation(newConversation.id);
    }
  }

  async sendTextMessage(text: string) {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    let { conversationId } = useChatStore.getState();
    if (!conversationId) {
      // If there's no active conversation, create one.
      const newConversation = await createConversation();
      conversationId = newConversation.id;
      useChatStore.getState().startConversation(conversationId);
    }
    
    const userMessageData = {
      conversationId: conversationId!,
      role: 'user' as const,
      text,
      meta: {
        stt_provider: STT_PROVIDER,
      }
    };
    
    const userMessage = await appendMessage(userMessageData);
    useChatStore.getState().addMessage(userMessage);

    useChatStore.getState().setStatus('thinking');

    const llmResponse = await llmService.chat({
      conversationId,
      messages: useChatStore.getState().messages,
    });
    
    const audioUrl = await ttsService.speak(llmResponse);
    
    const assistantMessageData = {
      conversationId,
      role: 'assistant' as const,
      text: llmResponse,
      audioUrl,
      meta: {
        llm_provider: LLM_PROVIDER,
        tts_provider: TTS_PROVIDER,
      }
    };
    
    const assistantMessage = await appendMessage(assistantMessageData);
    useChatStore.getState().addMessage(assistantMessage);

    audioPlayer.play(audioUrl, () => {
      useChatStore.getState().setStatus('idle');
      this.isTurnActive = false;
    });
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
      const newConversation = await createConversation();
      conversationId = newConversation.id;
      useChatStore.getState().startConversation(conversationId);
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

      const userMessageData = {
        conversationId: useChatStore.getState().conversationId!,
        role: 'user' as const,
        text: transcription,
        audioUrl: URL.createObjectURL(audioBlob),
        meta: {
          stt_provider: STT_PROVIDER,
        }
      };
      
      const userMessage = await appendMessage(userMessageData);
      useChatStore.getState().addMessage(userMessage);

      useChatStore.getState().setStatus('thinking');

      const llmResponse = await llmService.chat({
        conversationId: useChatStore.getState().conversationId || 'local',
        messages: useChatStore.getState().messages,
      });

      const audioUrl = await ttsService.speak(llmResponse);

      const assistantMessageData = {
        conversationId: useChatStore.getState().conversationId!,
        role: 'assistant' as const,
        text: llmResponse,
        audioUrl,
        meta: {
          llm_provider: LLM_PROVIDER,
          tts_provider: TTS_PROVIDER,
        }
      };
      
      const assistantMessage = await appendMessage(assistantMessageData);
      useChatStore.getState().addMessage(assistantMessage);

      audioPlayer.play(audioUrl, () => {
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
      });

    } catch (error: any) {
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
