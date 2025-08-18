// src/services/llm/chat.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

interface CreateMessageRequest {
  chat_id: string;
  text: string;
  client_msg_id: string;
}

interface StreamRequest {
  chat_id: string;
  k?: number;
}

class LlmService {
  async createMessage(request: CreateMessageRequest): Promise<{ message_id: string; chat_id: string; created_at: string }> {
    console.log(`[LLM] Creating user message for chat ${request.chat_id}...`);
    
    const { data, error } = await supabase.functions.invoke('messages.create', {
      body: request,
    });

    if (error) {
      throw new Error(`Error invoking messages.create: ${error.message}`);
    }
    if (data.error) {
      throw new Error(`messages.create returned an error: ${data.error}`);
    }
    return data;
  }

  streamChat(request: StreamRequest, onStream: (chunk: any) => void): AbortController {
    const abortController = new AbortController();

    const stream = async () => {
      const response = await fetch(`${supabase.functionsUrl}/llm-handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
          'apikey': supabase.anonKey,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: abortController.signal,
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value);
        const chunks = raw.split('\n\n').filter(Boolean);

        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            const json = JSON.parse(chunk.substring(6));
            onStream(json);
            if (json.event === 'done') {
              return;
            }
          }
        }
      }
    };

    stream().catch(error => {
      if (error.name !== 'AbortError') {
        console.error('SSE stream error:', error);
      }
    });

    return abortController;
  }
}

export const llmService = new LlmService();
