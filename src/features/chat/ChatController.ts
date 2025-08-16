// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { conversationTtsService } from '@/services/voice/conversationTts';
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
      console.log('[ChatController] Audio blob received:', { size: audioBlob.size, type: audioBlob.type });
      
      const transcription = await sttService.transcribe(audioBlob, useChatStore.getState().conversationId!, { stt_provider: STT_PROVIDER });
      console.log('[ChatController] STT transcription result:', { text: transcription, length: transcription.length });

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

      console.log('[ChatController] Calling conversation-llm with valid transcription:', userMessageForApi);
      const assistantMessage = await llmService.conversationChat({
        conversationId: useChatStore.getState().conversationId!,
        userMessage: userMessageForApi,
      });

      console.log('[ChatController] 🎯 CONVERSATION-LLM RESPONSE RECEIVED:');
      console.log('[ChatController] - Message ID:', assistantMessage.id);
      console.log('[ChatController] - Text:', assistantMessage.text?.slice(0, 100) + '...');
      console.log('[ChatController] - AudioURL:', assistantMessage.audioUrl ? 'Present' : 'NOT PRESENT');
      console.log('[ChatController] - Meta:', assistantMessage.meta);

      // Add the final assistant message
      useChatStore.getState().addMessage(assistantMessage);

      // For conversation mode, call TTS and wait for audio to complete
      if (assistantMessage.text && assistantMessage.id) {
        console.log('[ChatController] ✅ Assistant message received, calling TTS service...');
        console.log('[ChatController] 🔊 AUDIO: Requesting TTS for message:', assistantMessage.id);
        
        useChatStore.getState().setStatus('speaking');
        
        try {
          // Wait for TTS to complete
          await conversationTtsService.speakAssistant({
            conversationId: useChatStore.getState().conversationId!,
            messageId: assistantMessage.id,
            text: assistantMessage.text
          });
          
          // Check if we're in the middle of a reset (modal closed during audio)
          if (this.isResetting) {
            console.log('[ChatController] 🚨 Reset in progress - not starting next turn');
            return;
          }
          
          console.log('[ChatController] 🎵 Audio playback completed, starting next turn');
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
                console.log('[ChatController] ⏰ Starting next turn after TTS failure');
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
    console.log('[ChatController] 🚨 EMERGENCY RESET - Cleaning up all conversation resources');
    
    // Set reset flag immediately to prevent race conditions
    this.isResetting = true;
    
    console.log('[ChatController] Current state:', {
      isTurnActive: this.isTurnActive,
      conversationServiceInitialized: this.conversationServiceInitialized,
      status: useChatStore.getState().status,
      isResetting: this.isResetting
    });

    // 1. Force cleanup microphone service
    console.log('[ChatController] 🎙️ Force cleaning up microphone service');
    conversationMicrophoneService.forceCleanup();

    // 2. Stop any pending TTS operations - they will check isResetting flag
    console.log('[ChatController] 🔇 Marking TTS operations for cancellation');
    
    // 3. Reset all flags and state
    console.log('[ChatController] 🔄 Resetting all internal state');
    this.conversationServiceInitialized = false;
    this.isTurnActive = false;
    useChatStore.getState().setStatus('idle');

    // 4. Clear reset flag after a brief delay to ensure all operations see it
    setTimeout(() => {
      this.isResetting = false;
      console.log('[ChatController] 🔓 Reset flag cleared - ready for new conversation');
    }, 100);

    console.log('[ChatController] ✅ Emergency reset complete');
  }
}

export const chatController = new ChatController();
