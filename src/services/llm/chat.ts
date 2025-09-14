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
    // Fire-and-forget invoke (no await) to minimize perceived latency
    try {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => {
          supabase.functions.invoke('chat-send', {
            body: {
              chat_id: request.chat_id,
              text: request.text,
              client_msg_id: request.client_msg_id,
              mode: request.mode,
            },
          }).catch((error) => {
            networkErrorHandler.handleError(error, 'LlmService.sendMessage');
          });
        });
      } else {
        setTimeout(() => {
          supabase.functions.invoke('chat-send', {
            body: {
              chat_id: request.chat_id,
              text: request.text,
              client_msg_id: request.client_msg_id,
              mode: request.mode,
            },
          }).catch((error) => {
            networkErrorHandler.handleError(error, 'LlmService.sendMessage');
          });
        }, 0);
      }
    } catch {}

    // Immediate ack (optimistic UI already handled by caller)
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
