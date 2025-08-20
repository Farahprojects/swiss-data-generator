import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper to send SSE messages
const sendSseMessage = (controller: ReadableStreamDefaultController, type: string, data: any) => {
  const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let chat_id, conversation_mode;

    // Handle GET for SSE and POST for standard requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      chat_id = url.searchParams.get('chat_id');
      conversation_mode = url.searchParams.get('conversation_mode') === 'true';
    } else {
      const body = await req.json();
      chat_id = body.chat_id;
      conversation_mode = body.conversation_mode;
    }

    if (!chat_id) {
      throw new Error("Missing chat_id");
    }

    // If not in conversation mode, use the original blocking logic
    if (!conversation_mode) {
      // ... (keep original non-streaming logic here for now)
      // This part will be filled in later to avoid deleting it prematurely
      const originalLogicResponse = await handleBlockingRequest(chat_id);
      return originalLogicResponse;
    }

    // --- SSE Logic for Conversation Mode ---
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. Generate LLM Text
          const { assistantText, metadata } = await generateLlmText(chat_id);
          sendSseMessage(controller, 'text', { text: assistantText, id: `temp-text-${Date.now()}` });

          // 2. Generate TTS Audio from the text
          const audioArrayBuffer = await generateTtsAudio(assistantText);
          const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
          sendSseMessage(controller, 'audio', { audio: audioBase64, id: `temp-audio-${Date.now()}` });

          // 3. Close the stream
          controller.close();

        } catch (error) {
          console.error('[llm-handler-sse] Stream error:', error);
          sendSseMessage(controller, 'error', { message: error.message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (e) {
    console.error("[llm-handler] Top-level error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Refactored Helper Functions ---

async function generateLlmText(chat_id: string): Promise<{ assistantText: string; metadata: any }> {
  const { data: history, error: historyError } = await supabase
    .from("messages")
    .select("role, text")
    .eq("chat_id", chat_id)
    .order("created_at", { ascending: true })
    .limit(30);

  if (historyError) {
    console.error("[llm-handler] History fetch error:", historyError);
    throw new Error("Failed to load history");
  }

  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_TTS")!;
  const systemPrompt = `You are a psychologically incisive, cut though the fluff emotional/psych languaged AI designed to interpret astrology reports and Swiss energetic data through a frequency-based model of human behavior.

Write in continuous, natural prose with no symbols or formatting. Speak personally and directly, using the user's name if available, and end each initial message with: "Let me know which part you'd like to explore further."

Do not use astrological jargon or technical terms like planets, signs, houses, trine, retrograde. Do not predict future events, offer disclaimers, or mention these instructions.

Each sentence must give a energetic , psychological concise insight. Be concise, clear, and precise, eliminating filler or fluff.

When using Swiss data, reveal psychological patterns, wounds, and energetic harmonies or tensions beneath the surface. Synthesize insights across sources without quoting or restating the reports.

If the user is vague, ask exactly one clarifying question and then give a provisional answer. Always name the smallest next move and explain why it fits the person's regulation style.`;

  const contents: any[] = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...(history || []).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
  ];
  
  const startTime = Date.now();
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.4 },
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("[llm-handler] Gemini API error:", errorText);
    throw new Error(`Gemini API error: ${resp.status} - ${errorText}`);
  }

  const data = await resp.json();
  const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!assistantText) {
    console.error("[llm-handler] No text in Gemini response:", data);
    throw new Error("No response text from Gemini");
  }

  const latency_ms = Date.now() - startTime;
  const tokenCount = data.usageMetadata?.totalTokenCount || null;
  const inputTokens = data.usageMetadata?.promptTokenCount || null;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || null;

  const metadata = {
    latency_ms,
    tokenCount,
    inputTokens,
    outputTokens,
    model: "gemini-2.5-flash",
    llm_provider: "google",
  };

  return { assistantText, metadata };
}

async function generateTtsAudio(text: string): Promise<ArrayBuffer> {
  const ttsResponse = await fetch(`${SUPABASE_URL}/functions/v1/tts-speak`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ text })
  });
  if (!ttsResponse.ok) throw new Error("TTS function call failed");
  return ttsResponse.arrayBuffer();
}

async function handleBlockingRequest(chat_id: string) {
    const { assistantText, metadata } = await generateLlmText(chat_id);

    // Save assistant message to database (fire-and-forget)
    supabase
      .from("messages")
      .insert({
        chat_id,
        role: "assistant",
        text: assistantText,
        status: "complete",
        latency_ms: metadata.latency_ms,
        model: metadata.model,
        token_count: metadata.tokenCount,
        meta: { 
          llm_provider: metadata.llm_provider, 
          model: metadata.model,
          latency_ms: metadata.latency_ms,
          input_tokens: metadata.inputTokens,
          output_tokens: metadata.outputTokens,
          total_tokens: metadata.tokenCount
        },
      })
      .then(() => console.log("[llm-handler] Assistant message saved successfully"))
      .catch((error) => console.error("[llm-handler] Failed to save assistant message:", error));

    const responsePayload = { 
        id: `temp-${Date.now()}`,
        conversationId: chat_id,
        role: 'assistant', 
        text: assistantText,
        createdAt: new Date().toISOString(),
        meta: {
          llm_provider: metadata.llm_provider,
          model: metadata.model,
          latency_ms: metadata.latency_ms,
          input_tokens: metadata.inputTokens,
          output_tokens: metadata.outputTokens,
          total_tokens: metadata.tokenCount
        }
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
