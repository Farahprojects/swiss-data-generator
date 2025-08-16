import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_LLM_TTS") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { conversationId, messageId, text, useOpenAI = false } = await req.json();
    console.log("[tts-speak] Request received:", { conversationId, messageId, textLength: text?.length, useOpenAI });
    
    if (!conversationId || !messageId || !text) {
      console.error("[tts-speak] Missing required fields");
      return new Response(JSON.stringify({ error: "missing fields" }), { 
        status: 400, 
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    let bytes: Uint8Array;

    if (useOpenAI) {
      console.log("[tts-speak] Calling OpenAI TTS API...");
      
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy",
          response_format: "mp3",
        }),
      });

      if (!ttsRes.ok) {
        const err = await ttsRes.text();
        console.error("[tts-speak] OpenAI TTS API error:", ttsRes.status, err);
        return new Response(JSON.stringify({ error: `TTS ${ttsRes.status}: ${err}` }), { 
          status: 500, 
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }

      bytes = new Uint8Array(await ttsRes.arrayBuffer());
      console.log("[tts-speak] OpenAI TTS successful, audio bytes:", bytes.byteLength);
    } else {
      console.log("[tts-speak] Calling Google TTS API...");
      
      // Call Google TTS
      const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: "en-US", name: "en-US-Neural2-F", ssmlGender: "FEMALE" },
            audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0.0 },
          }),
        }
      );

      if (!ttsRes.ok) {
        const err = await ttsRes.text();
        console.error("[tts-speak] Google TTS API error:", ttsRes.status, err);
        return new Response(JSON.stringify({ error: `TTS ${ttsRes.status}: ${err}` }), { 
          status: 500, 
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }

      const { audioContent } = await ttsRes.json(); // base64
      console.log("[tts-speak] Google TTS successful, converting to audio bytes");
      
      bytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
    }
    console.log("[tts-speak] Returning audio bytes:", bytes.byteLength, "bytes");

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
    console.error("[tts-speak] Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
