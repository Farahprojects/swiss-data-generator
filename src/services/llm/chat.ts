// src/services/llm/chat.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

interface LlmRequest {
  conversationId: string;
  userMessage: {
    text: string;
    meta?: Record<string, any>;
  };
  requestAudio?: boolean; // Flag to request audio generation from Gemini
}

class LlmService {
  async chat(request: LlmRequest): Promise<Message> {
    console.log(`[LLM] Sending message for conversation ${request.conversationId}...`);
    
    const { data, error } = await supabase.functions.invoke('llm-handler', {
      body: {
        conversationId: request.conversationId,
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
