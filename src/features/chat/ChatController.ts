// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { streamPlayerService } from '@/services/voice/StreamPlayerService';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false;
  
  async initializeConversation(chat_id: string) {
    if (!chat_id) {
      console.error('[ChatController] initializeConversation: FAIL FAST - chat_id is required');
      throw new Error('chat_id is required for conversation initialization');
    }
    
    console.log('[ChatController] Initializing chat with verified chat_id:', chat_id);
    useChatStore.getState().startConversation(chat_id);
    
    try {
      const existingMessages = await getMessagesForConversation(chat_id);
      if (existingMessages.length > 0) {
        useChatStore.getState().loadMessages(existingMessages);
      }
    } catch (error) {
      console.error('[ChatController] Error loading existing messages:', error);
    }
  }

  async sendTextMessage(text: string) {
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: No chat_id in store.');
      return;
    }
    
    const client_msg_id = uuidv4();
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    try {
      const finalMessage = await llmService.sendMessage({ chat_id, text, client_msg_id });
      this.reconcileOptimisticMessage(finalMessage);
    } catch (error) {
      console.error("[ChatController] Error sending message:", error);
      useChatStore.getState().setError("Failed to send message. Please try again.");
      // Here you might want to remove the optimistic messages
    }
  }

  private addOptimisticMessages(chat_id: string, text: string, client_msg_id: string, audioUrl?: string) {
    const tempUserMessage: Message = {
      id: client_msg_id,
      conversationId: chat_id,
      role: 'user',
      text,
      audioUrl,
      createdAt: new Date().toISOString(),
    };
    useChatStore.getState().addMessage(tempUserMessage);

    const tempAssistantMessage: Message = {
      id: `thinking-${client_msg_id}`,
      client_msg_id,
      conversationId: chat_id,
      role: 'assistant',
      text: '...',
      status: 'thinking',
      createdAt: new Date().toISOString(),
    };
    useChatStore.getState().addMessage(tempAssistantMessage);
    useChatStore.getState().setStatus('thinking');
  }

  private reconcileOptimisticMessage(finalMessage: Message) {
    if (!finalMessage.client_msg_id) {
      console.error('[ChatController] Finalized message is missing client_msg_id, cannot reconcile UI.');
      return;
    }

    useChatStore.getState().updateMessage(
      `thinking-${finalMessage.client_msg_id}`, 
      { ...finalMessage, id: finalMessage.id || uuidv4(), status: 'complete' }
    );
    
    if (this.isTurnActive) {
      this.playAssistantAudioAndContinue(finalMessage, finalMessage.conversationId);
    } else {
      useChatStore.getState().setStatus('idle');
    }
  }

  private initializeConversationService() {
    if (this.conversationServiceInitialized) return;
    
    conversationMicrophoneService.initialize({
      onSilenceDetected: () => this.endTurn(),
      silenceTimeoutMs: 400 // Aligned with ChatTextMicrophoneService for faster response
    });
    
    this.conversationServiceInitialized = true;
  }

  async startTurn() {
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
      const { transcript } = await sttService.transcribe(audioBlob, useChatStore.getState().chat_id!);

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[ChatController] Empty transcription - ending turn gracefully.');
        this.resetTurn(true); // Don't restart turn on empty
        return;
      }

      const chat_id = useChatStore.getState().chat_id!;
      const client_msg_id = uuidv4();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.addOptimisticMessages(chat_id, transcript, client_msg_id, audioUrl);
      
      const finalMessage = await llmService.sendMessage({ chat_id, text: transcript, client_msg_id });
      this.reconcileOptimisticMessage(finalMessage);

    } catch (error: any) {
      console.error("[ChatController] Error processing voice input:", error);
      useChatStore.getState().setError('Failed to process audio.');
      this.resetTurn();
    }
  }

  private async playAssistantAudioAndContinue(assistantMessage: Message, chat_id: string) {
    if (assistantMessage.text && assistantMessage.id) {
      useChatStore.getState().setStatus('speaking');
      try {
        await conversationTtsService.speakAssistant({
          conversationId: chat_id,
          messageId: assistantMessage.id,
          text: assistantMessage.text
        });
        
        if (this.isResetting) return;
        
        this.resetTurn(false); // Restart turn after speaking
      } catch (ttsError) {
        console.error('[ChatController] ❌ TTS failed:', ttsError);
        this.resetTurn(true); // Don't restart if TTS fails
      }
    } else {
      this.resetTurn(true); // Don't restart if no text
    }
  }

  private resetTurn(endConversationFlow = true) {
    useChatStore.getState().setStatus('idle');
    this.isTurnActive = false;
    
    // Always clean up microphone service between turns
    conversationMicrophoneService.forceCleanup();
    
    if (!endConversationFlow && !this.isResetting) {
      // Short delay before starting next turn
      setTimeout(() => { if (!this.isResetting) this.startTurn(); }, 500);
    }
  }

  cancelTurn() {
    if (!this.isTurnActive) return;
    conversationMicrophoneService.forceCleanup();
    this.resetTurn(true);
  }

  resetConversationService() {
    this.isResetting = true;
    conversationMicrophoneService.forceCleanup();
    streamPlayerService.stop();
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');

    setTimeout(() => {
      this.isResetting = false;
    }, 100);
  }
}

export const chatController = new ChatController();
