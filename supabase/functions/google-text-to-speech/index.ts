import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only need Supabase for message metadata updates (text-only persistence)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[google-tts] Received request");

  if (req.method === "OPTIONS") {
    console.log("[google-tts] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { messageId, text } = await req.json();

    if (!messageId || !text) {
      throw new Error("Missing 'messageId' or 'text' in request body.");
    }

    console.log(`[google-tts] Processing TTS for messageId: ${messageId}`);

    // Call Google Text-to-Speech API
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "en-US",
            name: "en-US-Neural2-F", // Female neural voice
            ssmlGender: "FEMALE"
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0
          }
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error(`[google-tts] Google TTS API error: ${ttsResponse.status} - ${errorText}`);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    console.log("[google-tts] Successfully received audio from Google TTS");

    // The audio comes as a base64 string, so we need to decode it to binary first.
    const audioBase64 = ttsData.audioContent;
    const binaryString = atob(audioBase64);
    const audioBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBuffer[i] = binaryString.charCodeAt(i);
    }

    // Fire-and-forget metadata update (don't await - return audio immediately)
    supabaseAdmin
      .from('messages')
      .update({ 
        meta: { 
          tts_provider: "google",
          voice: "en-US-Neural2-F",
          audio_format: "mp3",
          tts_generated: true
        }
      })
      .eq('id', messageId)
      .then(() => {
        console.log("[google-tts] Successfully updated message metadata (fire-and-forget)");
      })
      .catch((error) => {
        console.error("[google-tts] Database update error (non-blocking):", error);
      });

    // Create a ReadableStream to send the audio data back in chunks.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(audioBuffer);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...CORS_HEADERS, "Content-Type": "audio/mpeg" },
      status: 200,
    });

  } catch (err) {
    console.error("[google-tts] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
