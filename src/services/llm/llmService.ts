interface SendMessageOptions {
  chat_id: string;
  guest_id: string;
  text: string;
  client_msg_id?: string;
  k?: number;
}

interface SendMessageResponse {
  assistant_message_id: string;
  latency_ms: number;
}

export class LlmService {
  private readonly functionsUrl = 'https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co';
  private readonly apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0';

  async sendMessage(options: SendMessageOptions): Promise<void> {
    try {
      const response = await fetch(`${this.functionsUrl}/chat-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Fire and forget - don't wait for response data
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

export const llmService = new LlmService();