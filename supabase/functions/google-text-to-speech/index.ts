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

// 🎵 RMS: Calculate real audio envelope from MP3 for speech-synced animation
async function calculateRMSFromMP3(mp3Bytes: Uint8Array, frameMs: number = 20): Promise<number[]> {
  try {
    // Decode MP3 to get audio buffer
    const audioContext = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
    const arrayBuffer = mp3Bytes.buffer.slice(mp3Bytes.byteOffset, mp3Bytes.byteOffset + mp3Bytes.byteLength);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;
    const frameSize = Math.floor((sampleRate * frameMs) / 1000); // Samples per frame
    
    // Calculate RMS for each frame
    const rmsValues: number[] = [];
    for (let i = 0; i < channelData.length; i += frameSize) {
      const end = Math.min(i + frameSize, channelData.length);
      let sum = 0;
      const len = end - i;
      
      for (let j = i; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      
      const rms = Math.sqrt(sum / len);
      rmsValues.push(rms);
    }
    
    // Normalize to [0, 1] range
    const maxRms = Math.max(...rmsValues);
    const normalizedRms = rmsValues.map(rms => maxRms > 0 ? rms / maxRms : 0);
    
    console.log(`[google-tts] 🎵 Calculated RMS envelope: ${normalizedRms.length} frames @ ${frameMs}ms`);
    return normalizedRms;
  } catch (error) {
    console.error('[google-tts] ❌ Failed to calculate RMS from MP3:', error);
    // Fallback to simple animation if RMS calculation fails
    const durationMs = (mp3Bytes.length / 16000) * 1000; // Rough estimate
    return generateFallbackAnimation(durationMs, frameMs);
  }
}

// 🎯 FALLBACK: Simple animation if RMS calculation fails
function generateFallbackAnimation(durationMs: number, frameMs: number): number[] {
  const numFrames = Math.ceil(durationMs / frameMs);
  const animationNumbers: number[] = [];
  
  for (let i = 0; i < numFrames; i++) {
    const progress = i / numFrames;
    const baseLevel = Math.sin(progress * Math.PI * 4) * 0.3 + 0.4;
    const randomVariation = (Math.random() - 0.5) * 0.2;
    const finalLevel = Math.max(0.1, Math.min(1.0, baseLevel + randomVariation));
    animationNumbers.push(finalLevel);
  }
  
  console.log(`[google-tts] 🎯 Generated fallback animation: ${animationNumbers.length} frames`);
  return animationNumbers;
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

    // 🎵 FETCH MP3 + PCM IN PARALLEL
    const mp3Resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:{text},voice:{languageCode:"en-US",name:voiceName},audioConfig:{audioEncoding:"MP3"}})}
    );
    if(!mp3Resp.ok){throw new Error("Google TTS API error");}
    const mp3Json=await mp3Resp.json();
    const audioBytes=Uint8Array.from(atob(mp3Json.audioContent),c=>c.charCodeAt(0));

    // 🎯 PRODUCTION-READY: Smooth, deterministic 4-bar animation
    const buildBars = (durMs: number, frameMs = 40, seed = 1337) => {
      const frames = Math.max(1, Math.ceil(durMs / frameMs));

      // ---- tiny seeded PRNG (mulberry32) for repeatable "random" ----
      function mulberry32(a: number) {
        return function () {
          let t = (a += 0x6d2b79f5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rnd = mulberry32(seed);

      // ---- helper: cosine (smooth) interpolation between control points ----
      const smoothLerp = (a: number, b: number, t: number) => {
        const t2 = (1 - Math.cos(Math.PI * t)) * 0.5; // 0..1 ease-in-out
        return a * (1 - t2) + b * t2;
      };

      // ---- 1) build a smooth "base" curve via random control points ----
      const ctrlStepMs = 240; // control every ~0.24s (natural speech-ish)
      const ctrlCount = Math.max(2, Math.ceil(durMs / ctrlStepMs) + 1);
      const ctrl: number[] = Array.from({ length: ctrlCount }, () => 0.2 + rnd() * 0.7); // 0.2..0.9

      // optional: bias some pauses by occasionally dropping points
      for (let i = 1; i < ctrl.length - 1; i++) {
        if (rnd() < 0.12) ctrl[i] *= 0.35; // light "pause"
      }

      const base: number[] = new Array(frames);
      for (let i = 0; i < frames; i++) {
        const tMs = i * frameMs;
        const c = tMs / ctrlStepMs;
        const c0 = Math.floor(c);
        const c1 = Math.min(ctrl.length - 1, c0 + 1);
        const f = Math.min(1, Math.max(0, c - c0));
        base[i] = smoothLerp(ctrl[c0], ctrl[c1], f);
      }

      // ---- 2) add tiny, cheap variation so bars don't move identically ----
      // lightweight "wobble" via two sines with small amplitudes
      const twoPi = Math.PI * 2;
      const hzA = 1.6 + rnd() * 0.6; // ~1.6–2.2 Hz
      const hzB = 3.0 + rnd() * 0.7; // ~3.0–3.7 Hz
      const ampA = 0.06; // subtle
      const ampB = 0.03; // very subtle
      const phase2 = rnd() * twoPi;
      const phase3 = rnd() * twoPi;

      const bar2: number[] = new Array(frames);
      const bar3: number[] = new Array(frames);

      for (let i = 0; i < frames; i++) {
        const t = i * frameMs / 1000; // seconds
        const wobble2 = Math.sin(twoPi * hzA * t + phase2) * ampA + Math.sin(twoPi * hzB * t) * ampB;
        const wobble3 = Math.sin(twoPi * (hzA * 1.07) * t + phase3) * ampA + Math.sin(twoPi * (hzB * 0.92) * t) * ampB;
        bar2[i] = clamp01(base[i] + wobble2);
        bar3[i] = clamp01(base[i] + wobble3);
      }

      // ---- 3) derive side bars as "followers" (clean look, less busy) ----
      // left = lean toward bar2; right = lean toward bar3
      const sideBlend = 0.75; // closer to base than middle bars
      const bar1: number[] = new Array(frames);
      const bar4: number[] = new Array(frames);
      for (let i = 0; i < frames; i++) {
        bar1[i] = clamp01(sideBlend * base[i] + (1 - sideBlend) * bar2[i]);
        bar4[i] = clamp01(sideBlend * base[i] + (1 - sideBlend) * bar3[i]);
      }

      // ---- 4) apply soft attack/release to avoid pops at start/end ----
      const attackMs = 140;
      const releaseMs = 160;
      const attackFrames = Math.min(frames, Math.ceil(attackMs / frameMs));
      const releaseFrames = Math.min(frames, Math.ceil(releaseMs / frameMs));
      for (let i = 0; i < frames; i++) {
        const att = i < attackFrames ? i / attackFrames : 1;
        const rel = i > frames - releaseFrames ? (frames - i) / releaseFrames : 1;
        const gate = Math.min(1, Math.max(0, smoothStep(att) * smoothStep(rel)));
        bar1[i] *= gate; bar2[i] *= gate; bar3[i] *= gate; bar4[i] *= gate;
      }

      // ---- 5) quantize to Uint8 (0..255) for super-cheap UI mapping ----
      const q = (arr: number[]) => {
        const out = new Uint8Array(frames);
        for (let i = 0; i < frames; i++) out[i] = Math.round(arr[i] * 255);
        return out;
      };

      return {
        frameMs,
        bars: [q(bar1), q(bar2), q(bar3), q(bar4)],
      };

      function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
      function smoothStep(x: number) { // 0..1 -> smooth 0..1
        const t = x < 0 ? 0 : x > 1 ? 1 : x;
        return t * t * (3 - 2 * t);
      }
    };

    const estDurMs = text.split(/\s+/).length / 150 * 60 * 1000;
    const animationData = buildBars(estDurMs, 40, 1337);
    const frameDurationMs = animationData.frameMs;

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
            audioBytes: Array.from(audioBytes),
            animationData: {
              frameMs: animationData.frameMs,
              bars: animationData.bars.map(bar => Array.from(bar)) // Convert Uint8Array to regular array for JSON
            },
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