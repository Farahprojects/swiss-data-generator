// src/features/chat/ChatController.ts
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { conversationTtsService } from '@/services/voice/conversationTts';
// import { conversationFlowMonitor } from '@/services/conversation/ConversationFlowMonitor';
import { getMessagesForConversation } from '@/services/api/messages';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';
import { audioPlaybackService } from '@/services/voice/AudioPlaybackService';

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
    this.addOptimisticMessages(chat_id, text, client_msg_id);
    
    // Start listening for assistant message
    // this.startAssistantMessageListener(chat_id); // Removed real-time listener
    
    try {
      const finalMessage = await llmService.sendMessage({ 
        chat_id, 
        text, 
        client_msg_id,
        mode: this.mode,
        sessionId: this.sessionId
      });
      
      // Stop the listener since we got the response
      // this.stopAssistantMessageListener(); // Removed real-time listener
      
      // Replace the "Thinking..." message with the real assistant message
      useChatStore.getState().updateMessage(`thinking-${client_msg_id}`, finalMessage);
      
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

    useChatStore.getState().addMessage(optimisticUserMessage);
    useChatStore.getState().addMessage(optimisticAssistantMessage);
    
    // Imperative scroll alignment after DOM update
    this.scrollToNewTurn(client_msg_id);
  }

  private scrollToNewTurn(userMessageId: string) {
    // Use double requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.getElementById('chat-scroll-container');
        const turn = document.querySelector(`[data-turn-id="${userMessageId}"]`) as HTMLElement;
        
        if (container && turn) {
          const containerTop = container.offsetTop;
          const turnTop = turn.offsetTop;
          container.scrollTop = turnTop - containerTop;
        }
      });
    });
  }

  private reconcileOptimisticMessage(finalMessage: Message) {
    // The thinking message ID is `thinking-${finalMessage.client_msg_id}`
    const thinkingMessageId = `thinking-${finalMessage.client_msg_id}`;
    useChatStore.getState().updateMessage(thinkingMessageId, finalMessage);
    
    // ✅ TTS TIMING: T1 - LLM text enters TTS pipeline
    console.log(`[TTS-TIMING] T1 - LLM text enters TTS pipeline at ${new Date().toISOString()}`, {
      messageId: finalMessage.id,
      textLength: finalMessage.text?.length || 0,
      chatId: finalMessage.chat_id
    });
    
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
    
    console.log('[ChatController] Setting status to recording...');
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
      
      // ✅ ADDED: Validate audio blob before processing
      if (!audioBlob || audioBlob.size === 0) {
        console.warn('[ChatController] Empty audio blob received - restarting turn');
        this.resetTurn(false); // Restart turn to give user another chance
        return;
      }
      
      console.log(`[ChatController] Processing audio blob: ${audioBlob.size} bytes`);
      
      const { transcript } = await sttService.transcribe(
        audioBlob, 
        useChatStore.getState().chat_id!,
        undefined,
        this.mode,
        this.sessionId
      );

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[ChatController] Empty transcript received - restarting turn');
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
    if (assistantMessage.text && assistantMessage.id) {
      

      
      useChatStore.getState().setStatus('speaking');
      // conversationFlowMonitor.observeStep('speaking');
      
      try {

        
        await conversationTtsService.speakAssistant({
          chat_id,
          messageId: assistantMessage.id,
          text: assistantMessage.text,
          sessionId: this.sessionId || null
        });
        

        
        // TTS completion callback
        if (this.isResetting) return;
        this.resetTurn(false); // Restart turn after speaking
        
      } catch (error) {
        console.warn(`[ChatController] TTS failed: ${error}. Falling back to audio clip.`);
        this.handleTtsFallback(assistantMessage);
      }
      
    } else {
      console.warn('[ChatController] Could not play audio. Missing text or messageId.');
      this.resetTurn(true); // Don't restart if no text
    }
  }

  private async handleTtsFallback(assistantMessage: Message) {
    try {
      const audioUrl = await conversationTtsService.getFallbackAudio(
        assistantMessage.chat_id,
        assistantMessage.text,
        this.sessionId || null
      );
      
      audioPlaybackService.play(audioUrl, () => {
        // TTS completion callback
        if (this.isResetting) return;
        this.resetTurn(false); // Restart turn after speaking
      });

    } catch (error) {
      console.error('[ChatController] TTS fallback failed:', error);
      // If even the fallback fails, just move on.
      this.resetTurn(true);
    }
  }

  private resetTurn(endConversationFlow: boolean = true) {
    console.log(`[ChatController] resetTurn called. endConversationFlow: ${endConversationFlow}`);
    
    if (endConversationFlow) {
      useChatStore.getState().setStatus('idle');
    } else {
      // Keep status as 'idle' briefly before starting next turn
      useChatStore.getState().setStatus('idle');
    }
    
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
      console.log('[ChatController] Scheduling next turn in 500ms...');
      this.turnRestartTimeout = setTimeout(() => { 
        if (!this.isResetting) {
          console.log('[ChatController] Starting next turn...');
          this.startTurn(); 
        }
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
    
    // Stop assistant message listener
    // this.stopAssistantMessageListener(); // Removed real-time listener
  }

  // Removed private startAssistantMessageListener and stopAssistantMessageListener
}

export const chatController = new ChatController();
