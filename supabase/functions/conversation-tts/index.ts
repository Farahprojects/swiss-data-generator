import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY");

serve(async (req) => {
  console.log(`[conversation-tts] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    console.log("[conversation-tts] Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId, messageId, text, chat_id } = await req.json();

    if (!sessionId || !messageId || !text || !chat_id) {
      throw new Error("Missing required fields: sessionId, messageId, text, chat_id");
    }
    
    console.log(`[conversation-tts] Processing TTS for sessionId: ${sessionId}, messageId: ${messageId}`);

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
            name: "en-US-Chirp3-HD-Puck",
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
      console.error("[conversation-tts] Google TTS API error:", ttsResponse.status, errorText);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    if (!audioContent) {
      throw new Error("No audio content received from Google TTS API");
    }

    // Decode base64 audio to binary
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    console.log(`[conversation-tts] Generated ${audioBytes.length} bytes of audio for sessionId: ${sessionId}`);

    // TODO: Stream audio to session audio channel
    // For now, just log that we would stream it
    console.log(`[conversation-tts] Would stream audio to session audio channel for sessionId: ${sessionId}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      messageId,
      audioSize: audioBytes.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[conversation-tts] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
