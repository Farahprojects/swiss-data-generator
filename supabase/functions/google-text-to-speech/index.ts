import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: CORS_HEADERS 
    });
  }

  try {
    const { chat_id, text, voice, sessionId } = await req.json();

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }
    
    // Require sessionId (validated upstream by existing session validation flow)
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing sessionId' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure we have a voice parameter - no fallbacks allowed
    if (!voice) {
      throw new Error("Voice parameter is required - no fallback allowed");
    }
    const voiceName = voice;

    // Call Google Text-to-Speech API
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "TheRAI-TTS/1.0",
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
            sampleRateHertz: 24000
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

    // Create data URL for direct browser playback
    const audioUrl = `data:audio/mpeg;base64,${audioContent}`;

    // Save TTS audio clip to dedicated audio table
    const { error: dbError } = await supabase
      .from("chat_audio_clips")
      .insert({
        chat_id: chat_id,
        role: "assistant",
        text: text,
        audio_url: audioUrl,
        session_id: sessionId,
        voice: voiceName,
        provider: "google",
        mime_type: "audio/mpeg",
        meta: { 
          tts_provider: "google",
          sessionId,
          tts_status: 'ready',
          processing_time_ms: Date.now() - startTime
        },
      });

    if (dbError) {
      console.error("[google-tts] Failed to save audio clip:", dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    console.log(`[google-tts] Audio clip saved to chat_audio_clips table`);

    // Return success response (audio URL is now in database)
    const response = new Response(JSON.stringify({
      success: true,
      message: "TTS audio generated and saved to database",
      audio_url: audioUrl
    }), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });

    const processingTime = Date.now() - startTime;
    console.log(`[google-tts] TTS completed in ${processingTime}ms`);

    return response;

  } catch (error) {
    console.error("[google-tts] Error:", error);
    
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});