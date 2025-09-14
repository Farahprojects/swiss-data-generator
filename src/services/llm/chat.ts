// src/services/llm/chat.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';
import { networkErrorHandler } from '@/utils/networkErrorHandler';

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
    // Fail-fast: stream over HTTP SSE to chat-stream
    const functionsUrl = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('VITE_SUPABASE_FUNCTIONS_URL is not set');
    }

    const res = await fetch(`${functionsUrl}/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: request.chat_id,
        text: request.text,
        client_msg_id: request.client_msg_id,
        mode: request.mode,
      })
    });

    if (!res.ok || !res.body) {
      throw new Error(`chat-stream failed: ${res.status}`);
    }

    // We don't parse stream here; UI will be updated via DB realtime
    return {
      id: request.client_msg_id || '',
      chat_id: request.chat_id,
      role: 'user',
      text: request.text,
      createdAt: new Date().toISOString(),
      status: 'thinking'
    } as unknown as Message;
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
