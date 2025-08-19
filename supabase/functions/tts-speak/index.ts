import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_LLM_TTS") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { conversationId, messageId, text, voice } = await req.json(); // Keep conversationId for client compatibility
    console.log("[tts-speak] Request received:", { chat_id: conversationId, messageId, textLength: text?.length, voice });
    
    if (!conversationId || !messageId || !text) {
      console.error("[tts-speak] Missing required fields");
      return new Response(JSON.stringify({ error: "missing fields" }), { 
        status: 400, 
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    console.log("[tts-speak] Calling Google TTS API...");
    
    // Call Google TTS
    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: ((): any => {
            const name: string = (voice && typeof voice === 'string' && voice.length > 0) ? voice : "en-US-Neural2-F";
            // Derive languageCode from name prefix like en-US-...
            let languageCode = "en-US";
            try {
              const parts = name.split("-");
              if (parts.length >= 2) languageCode = `${parts[0]}-${parts[1]}`;
            } catch (_) {}
            return { languageCode, name };
          })(),
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
    console.log("[tts-speak] TTS successful, converting to audio bytes");
    
    const bytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
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
