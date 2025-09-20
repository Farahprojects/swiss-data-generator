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
   * Note: chat_id is already verified by authentication
   */
  async sendMessage(request: { 
    chat_id: string; 
    text: string; 
    client_msg_id?: string;
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

  // Legacy chat() removed; llm-handler deprecated

}

export const llmService = new LlmService();
