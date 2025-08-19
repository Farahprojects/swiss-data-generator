// src/services/llm/chat.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

interface LlmRequest {
  chat_id: string;
  userMessage: {
    text: string;
    meta?: Record<string, any>;
  };
  requestAudio?: boolean; // Flag to request audio generation from Gemini
}

class LlmService {
  /**
   * TRUE FIRE-AND-FORGET: Send message and don't wait for response
   * User message appears immediately in UI, assistant response comes via real-time updates
   * Note: chat_id is already verified by verify-chat-access, no guest_id needed
   */
  async sendMessage(request: { chat_id: string; text: string; client_msg_id?: string }): Promise<void> {
    console.log(`[LLM] Fire-and-forget message send for chat ${request.chat_id}...`);
    
    // Fire-and-forget: don't wait for response
    supabase.functions.invoke('chat-send', {
      body: {
        chat_id: request.chat_id,
        text: request.text,
        client_msg_id: request.client_msg_id,
      },
    }).then(({ error }) => {
      if (error) {
        console.error(`[LLM] chat-send error (background):`, error);
      } else {
        console.log(`[LLM] Message sent successfully (background)`);
      }
    }).catch((err) => {
      console.error(`[LLM] chat-send failed (background):`, err);
    });

    console.log(`[LLM] Message dispatched (fire-and-forget)`);
  }

  // Legacy method - kept for compatibility if needed
  async chat(request: LlmRequest): Promise<Message> {
    console.log(`[LLM] Sending message for chat ${request.chat_id}...`);
    
    const { data, error } = await supabase.functions.invoke('llm-handler', {
      body: {
        chat_id: request.chat_id,
        userMessage: request.userMessage,
        requestAudio: request.requestAudio,
      },
    });

    if (error) {
      throw new Error(`Error invoking llm-handler: ${error.message}`);
    }

    if (data.error) {
      throw new Error(`llm-handler returned an error: ${data.error}`);
    }

    return data as Message;
  }

    // Conversation-specific LLM call with fire-and-forget TTS
  async conversationChat(request: Omit<LlmRequest, 'requestAudio'>): Promise<Message> {


    const { data, error } = await supabase.functions.invoke('conversation-llm', {
      body: {
        chat_id: request.chat_id,
        userMessage: request.userMessage,
      },
    });

    if (error) {
      throw new Error(`Error invoking conversation-llm: ${error.message}`);
    }

    if (data.error) {
      throw new Error(`conversation-llm returned an error: ${data.error}`);
    }

    return data as Message;
  }
}

export const llmService = new LlmService();
