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
import { SUPABASE_URL } from '@/config/env';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

class ChatController {
  private isTurnActive = false;
  private conversationServiceInitialized = false;
  private isResetting = false; // Flag to prevent race conditions during reset
  private realtimeChannel: RealtimeChannel | null = null;
  
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

  private establishRealtimeConnection(chat_id: string) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    console.log(`[ChatController] Subscribing to Realtime channel: conversation:${chat_id}`);
    this.realtimeChannel = supabase.channel(`conversation:${chat_id}`);

    this.realtimeChannel
      .on('broadcast', { event: 'text_final' }, ({ payload }) => {
        console.log('[ChatController] Received text_final event:', payload);
        const assistantMessage: Message = {
          id: payload.id,
          conversationId: chat_id,
          role: 'assistant' as const,
          text: payload.text,
          createdAt: new Date().toISOString(),
        };
        useChatStore.getState().addMessage(assistantMessage);
        useChatStore.getState().setStatus('speaking');
      })
      .on('broadcast', { event: 'audio_final' }, async ({ payload }) => {
        console.log('[ChatController] Received audio_final event');
        try {
          await initTtsAudio();
          const audioBlob = new Blob([Uint8Array.from(atob(payload.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();

          audio.onended = () => {
            if (this.isResetting) return;
            useChatStore.getState().setStatus('idle');
            this.isTurnActive = false;
            if (!this.isResetting) {
              this.startTurn();
            }
          };
        } catch (ttsError) {
          console.error('[ChatController] ❌ Realtime TTS failed:', ttsError);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ChatController] ✅ Successfully subscribed to Realtime channel.');
          // Now we can start the recording
          useChatStore.getState().setStatus('recording');
          conversationMicrophoneService.startRecording().catch(error => {
            useChatStore.getState().setError(error.message);
            this.isTurnActive = false;
          });
        } else {
          console.error('[ChatController] 🚨 Realtime subscription failed:', status);
          // Handle failed connection
        }
      });
  }

  async startTurn() {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] startTurn: FAIL FAST - No chat_id in store.');
      throw new Error('No conversation established. Cannot start turn.');
    }
    
    this.initializeConversationService();
    this.establishRealtimeConnection(chat_id);
  }

  async endTurn() {
    if (!this.isTurnActive) return;

    const { chat_id } = useChatStore.getState();
    if (!chat_id) {
      console.error('[ChatController] endTurn: FAIL FAST - No chat_id in store.');
      this.isTurnActive = false;
      useChatStore.getState().setStatus('idle');
      return;
    }
    
    useChatStore.getState().setStatus('transcribing');
    try {
      const audioBlob = await conversationMicrophoneService.stopRecording();
      
      // Transcribe audio using STT service
      const sttResponse = await sttService.transcribe(audioBlob, chat_id, {
        conversation_mode: true,
      });

      if (sttResponse.status === 'pending_realtime') {
        const userMessage: Message = {
          id: uuidv4(),
          conversationId: chat_id,
          role: 'user' as const,
          text: sttResponse.transcript,
          audioUrl: URL.createObjectURL(audioBlob),
          createdAt: new Date().toISOString(),
        };
        useChatStore.getState().addMessage(userMessage);
        useChatStore.getState().setStatus('thinking');
      } else {
        // Fallback or handle non-realtime response if necessary
        console.warn('[ChatController] Received non-realtime response in conversation mode.');
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
    
    // Unsubscribe from the realtime channel
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
      console.log('[ChatController] Unsubscribed from Realtime channel.');
    }

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
