// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { streamPlayerService } from '@/services/voice/StreamPlayerService';
// import { conversationFlowMonitor } from '@/services/conversation/ConversationFlowMonitor';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { realtimeAudioPlayer } from '@/services/voice/RealtimeAudioPlayer';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false;
  private turnRestartTimeout: NodeJS.Timeout | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  private mode: string = 'normal';
  private sessionId: string | null = null;

  constructor() {
    this.loadExistingMessages();
  }

  private async loadExistingMessages() {
    const { chat_id } = useChatStore.getState();
    if (!chat_id) return;

    try {
      const messages = await getMessagesForConversation(chat_id);
      useChatStore.getState().loadMessages(messages);
    } catch (error) {
      console.error('[ChatController] Error loading existing messages:', error);
    }
  }

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

  setConversationMode(mode: string, sessionId: string) {
    this.mode = mode;
    this.sessionId = sessionId;
    console.log(`[ChatController] Set conversation mode: ${mode}, sessionId: ${sessionId}`);
  }

  async sendTextMessage(text: string) {
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] sendTextMessage: No chat_id in store.');
      return;
    }
    
    const client_msg_id = uuidv4();
    console.log(`[ChatController] Sending message with client_msg_id: ${client_msg_id}, mode: ${this.mode}, sessionId: ${this.sessionId}`);
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    // Start listening for assistant message
    // this.startAssistantMessageListener(chat_id); // Removed real-time listener
    
    try {
      console.log('[ChatController] Calling llmService.sendMessage...');
      const finalMessage = await llmService.sendMessage({ 
        chat_id, 
        text, 
        client_msg_id,
        mode: this.mode,
        sessionId: this.sessionId
      });
      console.log('[ChatController] BACKUP_FETCH_USED=true - Received response from chat-send:', finalMessage);
      
      // Stop the listener since we got the response
      // this.stopAssistantMessageListener(); // Removed real-time listener
      
      // Replace the "Thinking..." message with the real assistant message
      useChatStore.getState().updateMessage(`thinking-${client_msg_id}`, finalMessage);
      console.log(`[ChatController] Replaced thinking message with real assistant message - ID: ${finalMessage.id}, turnId: ${client_msg_id}`);
      
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
    };

    const optimisticAssistantMessage: Message = {
      id: `thinking-${client_msg_id}`,
      chat_id: chat_id,
      role: "assistant",
      text: "Thinking...",
      createdAt: new Date().toISOString(),
      status: "thinking",
    };

    console.log(`[ChatController] Creating optimistic messages - User ID: ${client_msg_id}, Thinking ID: ${optimisticAssistantMessage.id}`);

    useChatStore.getState().addMessage(optimisticUserMessage);
    useChatStore.getState().addMessage(optimisticAssistantMessage);
  }

  private reconcileOptimisticMessage(finalMessage: Message) {
    // The thinking message ID is `thinking-${client_msg_id}`
    const thinkingMessageId = `thinking-${finalMessage.client_msg_id}`;
    useChatStore.getState().updateMessage(thinkingMessageId, finalMessage);
    this.playAssistantAudioAndContinue(finalMessage, finalMessage.chat_id);
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
    // conversationFlowMonitor.observeStep('listening');
    
    try {
      await conversationMicrophoneService.startRecording();
      // Reset auto-recovery on successful start
      // conversationFlowMonitor.resetAutoRecovery();
    } catch (error: any) {
      // conversationFlowMonitor.observeError('listening', error);
      useChatStore.getState().setError(error.message);
      this.isTurnActive = false;
    }
  }

  async endTurn() {
    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');
    // conversationFlowMonitor.observeStep('transcribing');
    
    try {
      const audioBlob = await conversationMicrophoneService.stopRecording();
      const { transcript } = await sttService.transcribe(
        audioBlob, 
        useChatStore.getState().chat_id!,
        undefined,
        this.mode,
        this.sessionId
      );

      if (!transcript || transcript.trim().length === 0) {
        this.resetTurn(false); // Restart turn to give user another chance
        return;
      }

      const chat_id = useChatStore.getState().chat_id!;
      const client_msg_id = uuidv4();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.addOptimisticMessages(chat_id, transcript, client_msg_id, audioUrl);
      
      // conversationFlowMonitor.observeStep('thinking');
      const finalMessage = await llmService.sendMessage({ 
        chat_id, 
        text: transcript, 
        client_msg_id,
        mode: this.mode,
        sessionId: this.sessionId
      });
      this.reconcileOptimisticMessage(finalMessage);
      
      // Reset auto-recovery on successful turn completion
      // conversationFlowMonitor.resetAutoRecovery();

    } catch (error: any) {
      // conversationFlowMonitor.observeError('transcribing', error);
      console.error("[ChatController] Error processing voice input:", error);
      useChatStore.getState().setError('Failed to process audio.');
      this.resetTurn();
    }
  }

  private async playAssistantAudioAndContinue(assistantMessage: Message, chat_id: string) {
    if (assistantMessage.text && assistantMessage.id && this.sessionId) {
      
      useChatStore.getState().setStatus('speaking');
      // conversationFlowMonitor.observeStep('speaking');
      
      await realtimeAudioPlayer.play(this.sessionId, assistantMessage.id, () => {
        // TTS completion callback
        if (this.isResetting) return;
        this.resetTurn(false); // Restart turn after speaking
      });
      
    } else {
      console.warn('[ChatController] Could not play audio. Missing text, messageId, or sessionId.');
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
    conversationMicrophoneService.forceCleanup();
    streamPlayerService.stop();
    
    // Stop assistant message listener
    // this.stopAssistantMessageListener(); // Removed real-time listener
  }

  // Removed private startAssistantMessageListener and stopAssistantMessageListener
}

export const chatController = new ChatController();
