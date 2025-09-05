import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";
if (!GOOGLE_TTS_API_KEY) {
  console.error("[google-tts] Missing GOOGLE-TTS API key");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { chat_id, text, voice } = await req.json();
    console.log("[google-tts] Request:", { chat_id, text: text?.substring(0, 50), voice });

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }
    if (!voice) {
      throw new Error("Voice parameter is required");
    }

    const voiceName = `en-US-Chirp3-HD-${voice}`;
    
    // Direct TTS call - no caching to avoid race conditions
    const resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "en-US", name: voiceName },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Google TTS API error (${resp.status}): ${errText}`);
    }

    const json = await resp.json();
    if (!json?.audioContent) {
      throw new Error("Google TTS API returned no audioContent");
    }

    const audioBytes = decodeBase64(json.audioContent);
    console.log("[google-tts] Audio generated:", audioBytes.length, "bytes");

    // Direct WebSocket broadcast - no fire-and-forget complications
    const { error: broadcastError } = await supabase
      .channel(`conversation:${chat_id}`)
      .send({
        type: "broadcast",
        event: "tts-ready",
        payload: {
          audioBytes: Array.from(audioBytes),
          audioUrl: null,
          text,
          chat_id,
          mimeType: "audio/mpeg",
          size: audioBytes.length,
        },
      });

    if (broadcastError) {
      console.error("[google-tts] Broadcast failed:", broadcastError);
    } else {
      console.log("[google-tts] Broadcast sent successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[google-tts] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? String(error) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
