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
   * Send message via chat-send (fire and forget)
   * User message is saved to DB, llm-handler is notified but no immediate response
   * Note: chat_id is already verified by verify-chat-access, no guest_id needed
   */
  async sendMessage(request: { 
    chat_id: string; 
    text: string; 
    client_msg_id?: string;
    mode?: string; // 🔥 CONVERSATION MODE: Flag for orchestrated flow
  }): Promise<Message> {
    
    // Use chat-send for all modes (including conversation mode)
    const { data, error } = await supabase.functions.invoke('chat-send', {
      body: {
        chat_id: request.chat_id,
        text: request.text,
        client_msg_id: request.client_msg_id,
        mode: request.mode,
      },
    });

    if (error) {
      console.error(`[LLM] chat-send error:`, error);
      throw new Error(`Error invoking chat-send: ${error.message}`);
    }

    if (data?.error && Object.keys(data.error).length > 0) {
      console.error(`[LLM] chat-send returned error:`, data.error);
      const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(`chat-send error: ${errorMessage}`);
    }

    return data as Message;
  }

  // Legacy method - kept for compatibility if needed
  async chat(request: LlmRequest): Promise<Message> {
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

}

export const llmService = new LlmService();
