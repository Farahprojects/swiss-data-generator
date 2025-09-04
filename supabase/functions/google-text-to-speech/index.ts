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

// 🚀 OPTIMIZATION: Pre-process text specifically for TTS to improve performance
function optimizeTextForTTS(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let optimized = text
    // Remove all markdown formatting completely
    .replace(/[#*_`~\[\](){}]/g, '')
    // Remove URLs (TTS doesn't need them)
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove email addresses
    .replace(/\S+@\S+\.\S+/g, '')
    // Simplify punctuation that might slow TTS
    .replace(/[;:]/g, ',')
    // Normalize quotes for better TTS pronunciation
    .replace(/[""''`]/g, '"')
    // Remove excessive punctuation
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    .replace(/[.]{3,}/g, '...')
    // Remove extra whitespace and normalize
    .replace(/\s+/g, ' ')
    // Trim and ensure we have content
    .trim();
  
  // 🚀 LENGTH OPTIMIZATION: Truncate very long text for faster TTS
  const MAX_TTS_LENGTH = 1000; // Characters
  if (optimized.length > MAX_TTS_LENGTH) {
    // Find a good breaking point (end of sentence)
    const truncated = optimized.substring(0, MAX_TTS_LENGTH);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > MAX_TTS_LENGTH * 0.7) {
      optimized = truncated.substring(0, lastSentenceEnd + 1);
    } else {
      optimized = truncated + '...';
    }
  }
  
  return optimized;
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

    // 🚀 OPTIMIZATION: Pre-process text for TTS performance
    const optimizedText = optimizeTextForTTS(text);
    console.log(`[google-tts] Text optimized: ${text.length} → ${optimizedText.length} chars`);

    // 🎵 FETCH MP3 + PCM IN PARALLEL
    const mp3Resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:{text:optimizedText},voice:{languageCode:"en-US",name:voiceName},audioConfig:{audioEncoding:"MP3"}})}
    );
    if(!mp3Resp.ok){throw new Error("Google TTS API error");}
    const mp3Json=await mp3Resp.json();
    const audioBytes=Uint8Array.from(atob(mp3Json.audioContent),c=>c.charCodeAt(0));


    // NOTE: Removing synthetic animation generation to reduce server work

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

        // 🚀 FIRE-AND-FORGET: WebSocket broadcast (non-blocking for faster response)
    console.log(`[google-tts] 📞 Making phone call with binary MP3 bytes to chat: ${chat_id}`);
    
    // Use EdgeRuntime.waitUntil for fire-and-forget WebSocket broadcast
    EdgeRuntime.waitUntil(
      supabase
        .channel(`conversation:${chat_id}`)
        .send({
          type: 'broadcast',
          event: 'tts-ready',
          payload: {
            audioBytes: Array.from(audioBytes),
            audioUrl: null, // No URL since we're not storing
            text: text, // Keep original text for display
            chat_id: chat_id,
            mimeType: 'audio/mpeg',
            size: audioBytes.length
          }
        })
        .then(({ error: broadcastError }) => {
          if (broadcastError) {
            console.error('[google-tts] ❌ Failed to make phone call:', broadcastError);
          } else {
          }
        })
        .catch((broadcastError) => {
          console.error('[google-tts] ❌ Error making phone call:', broadcastError);
        })
    );

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