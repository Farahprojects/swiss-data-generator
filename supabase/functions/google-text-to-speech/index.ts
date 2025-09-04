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

// 🎵 PHONEME-BASED: No envelope calculation functions needed

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
          timepointing: ["WORD", "PHONEME"], // Enable word and phoneme alignment
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
      // Google TTS timepoints format: { timeSeconds: number, markName?: string, type?: string }
      const start = tp.timeSeconds || 0;
      const nextTimepoint = timepoints[index + 1];
      const end = nextTimepoint ? nextTimepoint.timeSeconds : start + 0.1; // Use next timepoint or default 100ms
      
      // Determine intensity based on type and content
      let intensity = 0.5; // Default
      if (tp.type === 'PHONEME' && tp.markName) {
        intensity = tp.markName.match(/[aeiou]/i) ? 0.8 : 0.4; // Vowels = higher intensity
      } else if (tp.type === 'WORD') {
        intensity = 0.6; // Words get medium intensity
      }
      
      return {
        symbol: tp.markName || `${tp.type || 'phoneme'}_${index}`,
        start: start,
        end: end,
        intensity: intensity
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

    // 🎵 PHONEME-BASED: No envelope generation needed - using Google TTS timepoints
    
    // Pure streaming approach - no storage, no DB
    const responseData = {
      success: true,
      audioUrl: null, // No URL since we're not storing
      storagePath: null
    };

    // 🎵 PHONEME-BASED: No DB storage needed for conversation mode

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