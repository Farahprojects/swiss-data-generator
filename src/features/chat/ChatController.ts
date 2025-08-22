// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { streamPlayerService } from '@/services/voice/StreamPlayerService';
import { conversationFlowMonitor } from '@/services/conversation/ConversationFlowMonitor';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false;
  private turnRestartTimeout: NodeJS.Timeout | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  
  async initializeConversation(chat_id: string) {
    if (!chat_id) {
      console.error('[ChatController] initializeConversation: FAIL FAST - chat_id is required');
      throw new Error('chat_id is required for conversation initialization');
    }
    
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
      silenceTimeoutMs: 2000 // 2 seconds for natural conversation pauses
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
    conversationFlowMonitor.observeStep('listening');
    
    try {
      await conversationMicrophoneService.startRecording();
      // Reset auto-recovery on successful start
      conversationFlowMonitor.resetAutoRecovery();
    } catch (error: any) {
      conversationFlowMonitor.observeError('listening', error);
      useChatStore.getState().setError(error.message);
      this.isTurnActive = false;
    }
  }

  async endTurn() {
    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');
    conversationFlowMonitor.observeStep('transcribing');
    
    try {
      const audioBlob = await conversationMicrophoneService.stopRecording();
      const { transcript } = await sttService.transcribe(audioBlob, useChatStore.getState().chat_id!);

      if (!transcript || transcript.trim().length === 0) {
        this.resetTurn(false); // Restart turn to give user another chance
        return;
      }

      const chat_id = useChatStore.getState().chat_id!;
      const client_msg_id = uuidv4();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.addOptimisticMessages(chat_id, transcript, client_msg_id, audioUrl);
      
      conversationFlowMonitor.observeStep('thinking');
      const finalMessage = await llmService.sendMessage({ chat_id, text: transcript, client_msg_id });
      this.reconcileOptimisticMessage(finalMessage);
      
      // Reset auto-recovery on successful turn completion
      conversationFlowMonitor.resetAutoRecovery();

    } catch (error: any) {
      conversationFlowMonitor.observeError('transcribing', error);
      console.error("[ChatController] Error processing voice input:", error);
      useChatStore.getState().setError('Failed to process audio.');
      this.resetTurn();
    }
  }

  private async playAssistantAudioAndContinue(assistantMessage: Message, chat_id: string) {
    if (assistantMessage.text && assistantMessage.id) {
      // Set TTS context in the flow monitor for automatic streaming
      conversationFlowMonitor.setTtsContext(
        chat_id, 
        assistantMessage.id, 
        assistantMessage.text,
        () => {
          // TTS completion callback
          if (this.isResetting) return;
          this.resetTurn(false); // Restart turn after speaking
        }
      );
      
      // Trigger speaking step - TTS will be handled automatically by the monitor
      useChatStore.getState().setStatus('speaking');
      conversationFlowMonitor.observeStep('speaking');
      
    } else {
      this.resetTurn(true); // Don't restart if no text
    }
  }

  private resetTurn(endConversationFlow = true) {
    useChatStore.getState().setStatus('idle');
    this.isTurnActive = false;
    
    // Clear any existing turn restart timeout
    if (this.turnRestartTimeout) {
      clearTimeout(this.turnRestartTimeout);
      this.turnRestartTimeout = null;
    }
    
    if (endConversationFlow) {
      // End conversation completely - full cleanup
      conversationMicrophoneService.forceCleanup();
    } else {
      // Turn transition - stop current recording and VAD, but keep stream for next turn
      if (conversationMicrophoneService.getState().isRecording) {
        conversationMicrophoneService.stopRecording().catch((error) => {
          // Ignore errors during graceful stop
          console.warn('[ChatController] Graceful stop error (ignored):', error);
        });
      } else {
        // Even if not recording, we need to stop any running VAD loop
        conversationMicrophoneService.forceCleanup();
      }
    }
    
    if (!endConversationFlow && !this.isResetting) {
      // Short delay before starting next turn
      this.turnRestartTimeout = setTimeout(() => { 
        if (!this.isResetting) this.startTurn(); 
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
    
    conversationMicrophoneService.forceCleanup();
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
    
    conversationMicrophoneService.forceCleanup();
    streamPlayerService.stop();
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');

    this.resetTimeout = setTimeout(() => {
      this.isResetting = false;
    }, 100);
  }

  // Add cleanup method for component unmount
  cleanup() {
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
    this.cancelTurn();
  }
}

export const chatController = new ChatController();
