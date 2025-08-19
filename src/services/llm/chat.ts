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
   * Fire-and-forget message sending via chat-send edge function
   * User message appears immediately in UI, backend handles saving + LLM response
   * Note: chat_id is already verified by verify-chat-access, no guest_id needed
   */
  async sendMessage(request: { chat_id: string; text: string; client_msg_id?: string }): Promise<void> {
    console.log(`[LLM] Fire-and-forget message send for chat ${request.chat_id}...`);
    
    const { error } = await supabase.functions.invoke('chat-send', {
      body: {
        chat_id: request.chat_id,
        text: request.text,
        client_msg_id: request.client_msg_id,
      },
    });

    if (error) {
      console.error(`[LLM] chat-send error:`, error);
      throw new Error(`Error invoking chat-send: ${error.message}`);
    }

    console.log(`[LLM] Message sent successfully (fire-and-forget)`);
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
