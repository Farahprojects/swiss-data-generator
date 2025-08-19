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
