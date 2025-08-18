// supabase/functions/_shared/gemini.ts
export class Gemini {
  private apiKey: string;
  private endpoint = "https://generativelanguage.googleapis.com/v1beta/models";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async stream(messages: { role: string, text: string }[], model: string) {
    const url = `${this.endpoint}/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = JSON.parse(line.substring(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              controller.enqueue({ text });
            }
          }
        }
      },
    });

    return {
      [Symbol.asyncIterator]: () => stream[Symbol.asyncIterator](),
      finalization: response.json().catch(() => ({}))
    };
  }
}
