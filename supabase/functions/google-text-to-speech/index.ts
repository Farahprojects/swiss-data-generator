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
    const { messageId, text, voice } = await req.json();

    if (!messageId || !text) {
      throw new Error("Missing 'messageId' or 'text' in request body.");
    }
    
    const voiceName = voice || "en-US-Studio-O"; // Default to Studio-O (Female)
    
    // COMPREHENSIVE EDGE FUNCTION LOGGING
    console.log("🎯 [EDGE TTS DEBUG] ==========================================");
    console.log("🎯 [EDGE TTS DEBUG] 1. Received voice parameter:", voice);
    console.log("🎯 [EDGE TTS DEBUG] 2. Final voice name being used:", voiceName);
    console.log("🎯 [EDGE TTS DEBUG] 3. Message ID:", messageId);
    console.log("🎯 [EDGE TTS DEBUG] 4. Text length:", text.length);
    console.log("🎯 [EDGE TTS DEBUG] ==========================================");
    
    console.log(`[google-tts] Processing TTS for messageId: ${messageId} with voice: ${voiceName}`);

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

    // COMPREHENSIVE GOOGLE API LOGGING
    console.log("🎯 [GOOGLE API DEBUG] ==========================================");
    console.log("🎯 [GOOGLE API DEBUG] 1. Google API Response Status:", ttsResponse.status);
    console.log("🎯 [GOOGLE API DEBUG] 2. Google API Response Headers:", Object.fromEntries(ttsResponse.headers.entries()));
    console.log("🎯 [GOOGLE API DEBUG] 3. Voice sent to Google:", voiceName);
    console.log("🎯 [GOOGLE API DEBUG] ==========================================");

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

    // Fire-and-forget database update for message metadata
    supabaseAdmin
      .from('messages')
      .update({ 
        tts_voice: voiceName,
        tts_provider: 'google',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .then(() => console.log(`[google-tts] Updated message ${messageId} with TTS metadata`))
      .catch(err => console.error(`[google-tts] Failed to update message metadata:`, err));

    // Return streaming response
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(audioBytes);
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.length.toString(),
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