import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const t0 = Date.now();
  console.log(`[google-tts] Received request at ${t0}`);

  if (req.method === "OPTIONS") {
    console.log("[google-tts] Handling OPTIONS request");
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
    
    // The voice parameter should be the full name e.g., en-US-Chirp3-HD-Puck
    // This default is a fallback in case the client sends an empty voice parameter.
    const voiceName = voice || "en-US-Chirp3-HD-Puck";
    
    console.log(`[google-tts] Processing TTS for chat_id: ${chat_id} with voice: ${voiceName}`);
    


    const t1 = Date.now();
    console.log(`[google-tts] About to call Google TTS API at ${t1} (t0→t1: ${t1 - t0}ms)`);

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
            sampleRateHertz: 22050
          },
        }),
      }
    );

    const t2 = Date.now();
    console.log(`[google-tts] Google TTS API returned at ${t2} (t1→t2: ${t2 - t1}ms)`);



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

    const t3 = Date.now();
    console.log(`[google-tts] Base64 decoded at ${t3} (t2→t3: ${t3 - t2}ms)`);
    


    // Always return the full MP3 as fast as possible
    console.log(`[google-tts] Returning full audio file (${audioBytes.length} bytes) for chat_id: ${chat_id}`);
    
    const t4 = Date.now();
    console.log(`[google-tts] Response sent at ${t4} (t3→t4: ${t4 - t3}ms, total: ${t4 - t0}ms)`);
    

    
    return new Response(audioBytes, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.length.toString(),
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes',
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