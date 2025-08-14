// src/services/llm/chat.ts

import { ProviderName, Message } from '@/core/types';

interface LlmRequest {
  conversationId: string;
  reportId?: string;
  messages: Message[];
  provider?: ProviderName;
}

class LlmService {
  async chat(request: LlmRequest): Promise<string> {
    console.log(`[LLM] Getting response for conversation ${request.conversationId}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real implementation, you would send the request to your edge function,
    // which would then call the appropriate LLM provider.
    
    const mockResponse = "This is a mock response from the language model, based on your input.";
    console.log(`[LLM] Response received: "${mockResponse}"`);
    
    return mockResponse;
  }
}

export const llmService = new LlmService();
