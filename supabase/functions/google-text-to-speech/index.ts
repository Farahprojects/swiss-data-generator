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
    const { chat_id, text, voice, stream = true } = await req.json(); // Default to streaming

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }
    
    // The voice parameter should be the full name e.g., en-US-Chirp3-HD-Puck
    // This default is a fallback in case the client sends an empty voice parameter.
    const voiceName = voice || "en-US-Chirp3-HD-Puck";
    
    console.log(`[google-tts] Processing TTS for chat_id: ${chat_id} with voice: ${voiceName}`);

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
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );



    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("[google-tts] Google TTS API error:", ttsResponse.status, errorText);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    if (!audioContent) {
      throw new Error("No audio content received from Google TTS API");
    }

    // Decode base64 audio to binary
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    if (stream === false) {
      // Return the entire file at once
      console.log(`[google-tts] Returning full audio file (${audioBytes.length} bytes) for chat_id: ${chat_id}`);
      return new Response(audioBytes, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBytes.length.toString(),
        },
      });
    }

    // Return streaming response with chunked processing for better performance
    const CHUNK_SIZE = 16384; // 16KB chunks for optimal streaming
    const audioStream = new ReadableStream({
      start(controller) {
        // Send audio in chunks for better memory management and progressive loading
        for (let i = 0; i < audioBytes.length; i += CHUNK_SIZE) {
          const chunk = audioBytes.slice(i, i + CHUNK_SIZE);
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    return new Response(audioStream, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.length.toString(),
        'Cache-Control': 'no-cache', // Prevent caching for real-time TTS
        'Transfer-Encoding': 'chunked', // Enable chunked transfer
      },
    });

  } catch (error) {
    console.error("[google-tts] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});