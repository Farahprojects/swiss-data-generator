import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";
const ALLOWED_OPENAI_VOICES = new Set([
  "alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const start = Date.now();
    console.log("[ttss-openai] START", new Date(start).toISOString());
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY_THREE" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { conversationId, messageId, text, voice } = await req.json(); // Keep conversationId for client compatibility  
    console.log("[ttss-openai] Payload", { chat_id: conversationId, messageId, textLength: text?.length, voice });

    if (!text) {
      return new Response(JSON.stringify({ error: "missing text" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let selectedVoice = (voice || "alloy").toString();
    if (!ALLOWED_OPENAI_VOICES.has(selectedVoice)) {
      console.warn("[ttss-openai] Invalid voice for OpenAI:", selectedVoice, "→ falling back to 'alloy'");
      selectedVoice = "alloy";
    }

    console.log("[ttss-openai] Calling OpenAI TTS with voice:", selectedVoice);
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: selectedVoice,
        response_format: "mp3",
      }),
    });

    console.log("[ttss-openai] OpenAI response status:", ttsRes.status);
    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("[ttss-openai] OpenAI error:", ttsRes.status, err);
      return new Response(JSON.stringify({ error: `OpenAI TTS ${ttsRes.status}: ${err}` }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await ttsRes.arrayBuffer());
    console.log("[ttss-openai] Bytes length:", bytes.byteLength, "durationMs:", Date.now() - start);

    return new Response(bytes, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (e) {
    console.error("[ttss-openai] Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});


