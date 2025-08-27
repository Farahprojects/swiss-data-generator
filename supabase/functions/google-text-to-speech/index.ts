import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

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
            audioEncoding: "LINEAR16", // WAV PCM format
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

    // Create WAV header for PCM data
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBytes.length;
    const fileSize = 36 + dataSize;

    // WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, fileSize, true); // File size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // fmt chunk
    view.setUint32(12, 0x666D7420, false); // "fmt "
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true); // channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, byteRate, true); // byte rate
    view.setUint16(32, blockAlign, true); // block align
    view.setUint16(34, bitsPerSample, true); // bits per sample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // data size

    // Combine WAV header with PCM data
    const wavBytes = new Uint8Array(44 + audioBytes.length);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    wavBytes.set(audioBytes, 44);

    // Calculate duration in milliseconds
    const durationMs = Math.round((dataSize / byteRate) * 1000);

    // Generate unique TTS ID
    const tts_id = `${chat_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response = new Response(JSON.stringify({
      audioContent: encode(wavBytes), // Use safe base64 encoding
      mimeType: 'audio/wav',
      sampleRate: 24000,
      channels: 1,
      durationMs,
      tts_id
    }), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });

    const processingTime = Date.now() - startTime;
    console.log(`[google-tts] TTS completed in ${processingTime}ms, duration: ${durationMs}ms, tts_id: ${tts_id}`);

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