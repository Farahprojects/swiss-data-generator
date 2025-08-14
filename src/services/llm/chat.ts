// src/services/llm/chat.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

interface LlmRequest {
  conversationId: string;
  reportId?: string;
  messages: Message[];
}

class LlmService {
  async chat(request: LlmRequest): Promise<string> {
    console.log(`[LLM] Getting response for conversation ${request.conversationId}...`);
    
    const { data, error } = await supabase.functions.invoke('llm-handler', {
      body: { messages: request.messages },
    });

    if (error) {
      throw new Error(`Error invoking llm-handler: ${error.message}`);
    }

    return data.response;
  }
}

export const llmService = new LlmService();
