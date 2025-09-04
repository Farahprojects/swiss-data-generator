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

// 🎯 SIMPLE: Generate animation numbers from MP3 duration (no complex audio analysis)
function generateSimpleAnimationNumbers(durationMs: number, frameMs: number = 50): number[] {
  const numFrames = Math.ceil(durationMs / frameMs);
  const animationNumbers: number[] = [];
  
  // Generate simple wave pattern for visual appeal
  for (let i = 0; i < numFrames; i++) {
    const progress = i / numFrames;
    // Simple sine wave with some randomness for natural feel
    const baseLevel = Math.sin(progress * Math.PI * 4) * 0.3 + 0.4;
    const randomVariation = (Math.random() - 0.5) * 0.2;
    const finalLevel = Math.max(0.1, Math.min(1.0, baseLevel + randomVariation));
    animationNumbers.push(finalLevel);
  }
  
  console.log(`[google-tts] 🎯 Generated ${animationNumbers.length} simple animation numbers for ${durationMs}ms audio`);
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

    // Call Google Text-to-Speech API for MP3 (playback)
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

    // Decode base64 MP3 audio content to raw bytes
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    // 🎯 SIMPLE: Generate animation numbers based on estimated audio duration
    // Estimate duration from text length (rough approximation: ~150 words per minute)
    const wordsPerMinute = 150;
    const words = text.split(/\s+/).length;
    const estimatedDurationMs = (words / wordsPerMinute) * 60 * 1000;
    const animationNumbers = generateSimpleAnimationNumbers(estimatedDurationMs, 50); // 20fps
    
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
            animationNumbers: animationNumbers, // Simple animation numbers (0-1)
            frameDurationMs: 50, // 20fps animation
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