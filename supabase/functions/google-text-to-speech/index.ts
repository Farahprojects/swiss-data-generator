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

// 🎵 Calculate audio envelope from LINEAR16 PCM for precise bar animation
function calculateEnvelopeFromLinear16(pcmBytes: Uint8Array, sampleRate: number, windowMs: number = 20): { envelope: number[]; frameDurationMs: number } {
  // Convert bytes to signed 16-bit samples
  const dataView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
  const numSamples = Math.floor(pcmBytes.byteLength / 2);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const s = dataView.getInt16(i * 2, true); // little-endian
    samples[i] = s / 32768; // normalize to [-1, 1]
  }

  // Compute RMS over fixed windows (e.g., 20ms)
  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const envelope: number[] = [];
  for (let i = 0; i < samples.length; i += windowSize) {
    const end = Math.min(i + windowSize, samples.length);
    let sum = 0;
    const len = end - i;
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    const rms = Math.sqrt(sum / Math.max(1, len));
    envelope.push(rms);
  }

  // Normalize 0..1
  let max = 0;
  let min = 1;
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > max) max = envelope[i];
    if (envelope[i] < min) min = envelope[i];
  }
  const range = Math.max(1e-6, max - min);
  for (let i = 0; i < envelope.length; i++) {
    envelope[i] = (envelope[i] - min) / range;
  }

  const frameDurationMs = (windowSize / sampleRate) * 1000;
  console.log(`[google-tts] 🎵 Calculated PCM envelope: ${envelope.length} frames @ ${frameDurationMs.toFixed(2)}ms`);
  return { envelope, frameDurationMs };
}

// Utility: Uint8Array → base64
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: CORS_HEADERS 
    });
  }

  try {
    const { chat_id, text, voice } = await req.json();

    console.log(`[google-tts] Request received - chat_id: ${chat_id}, text length: ${text?.length}, voice: ${voice}`);

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }
    
    // Ensure we have a voice parameter - no fallbacks allowed
    if (!voice) {
      throw new Error("Voice parameter is required - no fallback allowed");
    }
    
    const voiceName = `en-US-Chirp3-HD-${voice}`;
    console.log(`[google-tts] Using voice: ${voiceName}`);

    // Call Google Text-to-Speech API for MP3 (playback) with alignment data
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
          enableTimePointing: ["SSML_MARK"], // Enable phoneme alignment
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
    const timepoints = ttsData.timepoints || []; // Phoneme alignment data

    if (!audioContent) {
      throw new Error("No audio content received from Google TTS API");
    }

    // Decode base64 MP3 audio content to raw bytes
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
    
    // Process phoneme alignment data for animation
    console.log('[google-tts] 🔍 Raw timepoints:', JSON.stringify(timepoints, null, 2));
    
    const phonemes = timepoints.map((tp: any, index: number) => {
      // Google TTS timepoints format: { timeSeconds: number, markName?: string }
      const start = tp.timeSeconds || 0;
      const nextTimepoint = timepoints[index + 1];
      const end = nextTimepoint ? nextTimepoint.timeSeconds : start + 0.1; // Use next timepoint or default 100ms
      
      return {
        symbol: tp.markName || `phoneme_${index}`,
        start: start,
        end: end,
        intensity: tp.markName ? (tp.markName.match(/[aeiou]/i) ? 0.8 : 0.4) : 0.5 // Vowels = higher intensity
      };
    });
    
    console.log(`[google-tts] 🎵 Generated ${phonemes.length} phoneme timepoints for animation`);
    
    // Fallback: If no timepoints, create simple word-based timing
    if (phonemes.length === 0) {
      console.log('[google-tts] ⚠️ No timepoints received, creating fallback word-based timing');
      const words = text.split(' ');
      const avgWordDuration = 0.5; // 500ms per word average
      
      for (let i = 0; i < words.length; i++) {
        const start = i * avgWordDuration;
        const end = (i + 1) * avgWordDuration;
        phonemes.push({
          symbol: `word_${i}`,
          start: start,
          end: end,
          intensity: 0.6 // Medium intensity for words
        });
      }
    }

    // 🚫 DISABLED: Envelope generation for performance testing
    // In parallel, request LINEAR16 for precise envelope calculation (same text/voice)
    // const pcmSampleRate = 22050;
    // const pcmReq = fetch(
    //   `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Accept": "application/json",
    //       "User-Agent": "TheRAI-TTS/1.0",
    //     },
    //     body: JSON.stringify({
    //       input: { text },
    //       voice: {
    //         languageCode: "en-US",
    //         name: voiceName,
    //       },
    //       audioConfig: {
    //         audioEncoding: "LINEAR16",
    //         speakingRate: 1.0,
    //         pitch: 0.0,
    //         sampleRateHertz: pcmSampleRate
    //       },
    //     }),
    //   }
    // );
    // const pcmResp = await pcmReq;
    // if (!pcmResp.ok) {
    //   const errText = await pcmResp.text();
    //   console.error("[google-tts] LINEAR16 request failed:", pcmResp.status, errText);
    //   throw new Error(`Google TTS LINEAR16 error: ${pcmResp.status}`);
    // }
    // const pcmJson = await pcmResp.json();
    // const pcmContent = pcmJson.audioContent as string;
    // const pcmBytes = Uint8Array.from(atob(pcmContent), c => c.charCodeAt(0));
    // const { envelope, frameDurationMs } = calculateEnvelopeFromLinear16(pcmBytes, pcmSampleRate, 20);

    // 📉 Downsample envelope to ~15 fps to reduce WS payload size and RAF load
    // const TARGET_FPS = 15;
    // const desiredFrameMs = 1000 / TARGET_FPS;
    // const stride = Math.max(1, Math.round(desiredFrameMs / frameDurationMs));
    // const downsampledEnvelope: number[] = [];
    // for (let i = 0; i < envelope.length; i += stride) {
    //   downsampledEnvelope.push(envelope[i]);
    // }
    // const downsampledFrameDurationMs = frameDurationMs * stride;
    // console.log(
    //   `[google-tts] 📉 Downsampled envelope: ${downsampledEnvelope.length} frames @ ${downsampledFrameDurationMs.toFixed(2)}ms (stride=${stride})`
    // );

    // 📦 Quantize to 8-bit (0..255) and base64 encode for lighter WS JSON payload
    // const quantized = new Uint8Array(downsampledEnvelope.length);
    // for (let i = 0; i < downsampledEnvelope.length; i++) {
    //   const clamped = Math.max(0, Math.min(1, downsampledEnvelope[i] || 0));
    //   quantized[i] = Math.round(clamped * 255);
    // }
    // const envelopeBase64 = uint8ToBase64(quantized);
    // const audioBase64 = uint8ToBase64(audioBytes); // Base64 is 33% larger than binary!
    
    // Pure streaming approach - no storage, no DB
    const responseData = {
      success: true,
      audioUrl: null, // No URL since we're not storing
      storagePath: null
    };

    // Save TTS audio clip to dedicated audio table in background (non-blocking)
    // COMMENTED OUT: No longer saving to DB for conversation mode
    /*
    EdgeRuntime.waitUntil(
      supabase.from("chat_audio_clips").insert({
        chat_id: chat_id,
        role: "assistant",
        audio_url: signedUrl,
        storage_path: fileName,
        voice: voiceName,
        provider: "google",
        meta: { 
          tts_status: 'ready',
          processing_time_ms: Date.now() - startTime
        },
      }).then(({ error }) => {
        if (error) {
          console.error("[google-tts] Background DB insert failed:", error);
        } else {
          console.log(`[google-tts] Background DB insert completed`);
        }
      })
    );
    */

    const processingTime = Date.now() - startTime;
    console.log(`[google-tts] TTS completed in ${processingTime}ms`);

        // 📞 Make the phone call - push raw MP3 bytes + envelope data directly to browser via WebSocket
    try {
      console.log(`[google-tts] 📞 Making phone call with binary MP3 bytes + envelope to chat: ${chat_id}`);
      
      // Send raw MP3 bytes + envelope data via WebSocket
      const { data: broadcastData, error: broadcastError } = await supabase
        .channel(`conversation:${chat_id}`)
        .send({
          type: 'broadcast',
          event: 'tts-ready',
          payload: {
            audioBytes: Array.from(audioBytes), // Raw MP3 bytes as array
            phonemes: phonemes, // Phoneme alignment data for animation
            audioUrl: null, // No URL since we're not storing
            text: text,
            chat_id: chat_id,
            mimeType: 'audio/mpeg',
            size: audioBytes.length
          }
        });

      if (broadcastError) {
        console.error('[google-tts] ❌ Failed to make phone call:', broadcastError);
      } else {
        console.log('[google-tts] ✅ Phone call successful - binary MP3 bytes delivered directly');
      }
    } catch (broadcastError) {
      console.error('[google-tts] ❌ Error making phone call:', broadcastError);
    }

    // Return success response with performance timing
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Server-Timing': `tts;dur=${processingTime}`
      },
    });

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