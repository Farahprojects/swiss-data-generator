import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inlined Gemini client logic
class Gemini {
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


const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY")!;
const CHAT_MODEL = Deno.env.get("CHAT_MODEL") || 'gemini-1.5-flash';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chat_id, k = 30 } = await req.json();
    if (!chat_id) {
      return new Response(JSON.stringify({ error: "Missing required field: chat_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: messages, error: historyError } = await supabase
      .from("messages")
      .select("role, text")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true })
      .limit(k);

    if (historyError) throw historyError;

    const { data: provisional, error: provisionalError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "assistant",
        status: "streaming",
        model: CHAT_MODEL,
        meta: {}
      })
      .select("id")
      .single();

    if (provisionalError) throw provisionalError;
    const assistantMessageId = provisional.id;

    const gemini = new Gemini(GEMINI_API_KEY);
    const stream = await gemini.stream(messages, CHAT_MODEL);

    let assistantText = "";
    const startTime = Date.now();

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          assistantText += chunk.text;
        }
        controller.enqueue(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
        controller.close();
      }
    });

    const finalizePromise = (async () => {
      await stream.finalization;
      const latency_ms = Date.now() - startTime;

      const { error: updateError } = await supabase
        .from("messages")
        .update({
          text: assistantText,
          status: "complete",
          latency_ms,
        })
        .eq("id", assistantMessageId);

      if (updateError) {
        console.error("Error finalizing assistant message:", updateError);
        await supabase.from("messages").update({
          status: "failed",
          error: { message: updateError.message }
        }).eq("id", assistantMessageId);
      }
    })();

    if (req.headers.get("accept") === "text/event-stream") {
      // Deno specific EdgeRuntime is not needed for this approach.
      // Deno.waitUntil(finalizePromise);
      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    } else {
      // This is a non-streaming request for some reason, wait for finalization
      await finalizePromise;
      return new Response(JSON.stringify({ text: assistantText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
