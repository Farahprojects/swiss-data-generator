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
  private abortController: AbortController | null = null;
  private readonly functionsUrl = 'https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co';
  private readonly apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0';

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResponse> {
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendMessageStream(
    options: SendMessageOptions,
    onDelta: (delta: string) => void,
    onComplete?: (response: SendMessageResponse) => void,
    onError?: (error: Error) => void
  ): Promise<AbortController> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.functionsUrl}/chat-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(options),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.delta) {
                onDelta(data.delta);
              } else if (data.done) {
                onComplete?.({
                  assistant_message_id: data.assistant_message_id,
                  latency_ms: data.latency_ms
                });
                return this.abortController;
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted');
        return this.abortController;
      }
      console.error('Stream error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }

    return this.abortController;
  }

  cancelStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const llmService = new LlmService();