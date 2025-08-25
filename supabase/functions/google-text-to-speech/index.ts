import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const t0 = Date.now();
  console.log(`[TTS-SERVER] 🎯 TTS edge function received request at ${t0}ms`);

  if (req.method === "OPTIONS") {
    console.log("[google-tts] Handling OPTIONS request");
    return new Response(null, { 
      status: 204,
      headers: CORS_HEADERS 
    });
  }

  try {
    const t1 = Date.now();
    console.log(`[TTS-SERVER] 📥 Parsing request body at ${t1}ms (t0→t1: ${t1 - t0}ms)`);
    
    const { chat_id, text, voice, sessionId } = await req.json();

    const t2 = Date.now();
    console.log(`[TTS-SERVER] ✅ Request parsed at ${t2}ms (t1→t2: ${t2 - t1}ms)`);
    console.log(`[TTS-SERVER] 📝 Text length: ${text?.length || 0} chars`);
    console.log(`[TTS-SERVER] 🎤 Voice: ${voice}`);
    console.log(`[TTS-SERVER] 💬 Chat ID: ${chat_id}`);

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
    
    const t3 = Date.now();
    console.log(`[TTS-SERVER] 🧹 Input validation completed at ${t3}ms (t2→t3: ${t3 - t2}ms)`);
    console.log(`[TTS-SERVER] 🎤 Final voice name: ${voiceName}`);

    const t4 = Date.now();
    console.log(`[TTS-SERVER] 🌐 Calling Google TTS API at ${t4}ms (t3→t4: ${t4 - t3}ms)`);

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

    const t5 = Date.now();
    console.log(`[TTS-SERVER] 📡 Google TTS API responded at ${t5}ms (t4→t5: ${t5 - t4}ms)`);

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("[google-tts] Google TTS API error:", ttsResponse.status, errorText);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const t6 = Date.now();
    console.log(`[TTS-SERVER] 📥 Parsing Google TTS response at ${t6}ms (t5→t6: ${t6 - t5}ms)`);
    
    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    const t7 = Date.now();
    console.log(`[TTS-SERVER] ✅ Google TTS response parsed at ${t7}ms (t6→t7: ${t7 - t6}ms)`);
    console.log(`[TTS-SERVER] 📦 Audio content length: ${audioContent?.length || 0} chars`);

    if (!audioContent) {
      throw new Error("No audio content received from Google TTS API");
    }

    // Decode base64 audio to binary
    const t8 = Date.now();
    console.log(`[TTS-SERVER] 🔄 Decoding base64 audio at ${t8}ms (t7→t8: ${t8 - t7}ms)`);
    
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    const t9 = Date.now();
    console.log(`[TTS-SERVER] ✅ Base64 decoded at ${t9}ms (t8→t9: ${t9 - t8}ms)`);
    console.log(`[TTS-SERVER] 📦 Audio bytes size: ${audioBytes.length} bytes`);

    const t10 = Date.now();
    console.log(`[TTS-SERVER] 📤 Sending binary response at ${t10}ms (t9→t10: ${t10 - t9}ms)`);

    const response = new Response(audioBytes, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.length.toString(),
      },
    });

    const t11 = Date.now();
    console.log(`[TTS-SERVER] 🏁 Response sent at ${t11}ms (t10→t11: ${t11 - t10}ms)`);
    console.log(`[TTS-SERVER] 🏁 Total TTS server processing time: ${t11 - t0}ms`);
    console.log(`[TTS-SERVER] 📊 Breakdown:`);
    console.log(`[TTS-SERVER]   - Request parsing: ${t2 - t0}ms`);
    console.log(`[TTS-SERVER]   - Input validation: ${t3 - t2}ms`);
    console.log(`[TTS-SERVER]   - Google TTS API call: ${t5 - t4}ms`);
    console.log(`[TTS-SERVER]   - Response parsing: ${t7 - t6}ms`);
    console.log(`[TTS-SERVER]   - Base64 decoding: ${t9 - t8}ms`);
    console.log(`[TTS-SERVER]   - Response sending: ${t11 - t10}ms`);

    return response;

  } catch (error) {
    const terror = Date.now();
    console.error(`[TTS-SERVER] ❌ Error occurred at ${terror}ms (t0→terror: ${terror - t0}ms)`);
    console.error("[google-tts] Error:", error);
    
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});