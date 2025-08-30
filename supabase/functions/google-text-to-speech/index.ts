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

    // Decode base64 audio content to raw MP3 bytes
    const audioBytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const timestamp = Date.now();
    const fileName = `clips/${chat_id}/${timestamp}-${crypto.randomUUID()}.mp3`;
    
    console.log(`[google-tts] Uploading audio file: ${fileName}, size: ${audioBytes.length} bytes`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ChatAudio')
      .upload(fileName, audioBytes, {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000, immutable',
        contentDisposition: 'inline',
        upsert: false
      });

    if (uploadError) {
      console.error("[google-tts] Storage upload failed:", uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    console.log(`[google-tts] Audio uploaded successfully to: ${uploadData.path}`);

    // Generate signed URL with 5 minute expiration for immediate playback
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('ChatAudio')
      .createSignedUrl(fileName, 300); // 5 minutes

    if (signedUrlError) {
      console.error("[google-tts] Failed to create signed URL:", signedUrlError);
      // Fallback to public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ChatAudio')
        .getPublicUrl(fileName);
      
      console.log(`[google-tts] Using fallback public URL: ${publicUrl}`);
      
      const responseData = {
        success: true,
        audioUrl: publicUrl,
        storagePath: fileName
      };
      
      // Save to DB in background (non-blocking)
      EdgeRuntime.waitUntil(
        supabase.from("chat_audio_clips").insert({
          chat_id: chat_id,
          role: "assistant",
          text: text,
          audio_url: publicUrl,
          storage_path: fileName,
          voice: voiceName,
          provider: "google",
          mime_type: "audio/mpeg",
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
      
      return responseData;
    }

    const signedUrl = signedUrlData.signedUrl;
    console.log(`[google-tts] Signed URL generated: ${signedUrl}`);

    // Prepare response data with signed URL
    const responseData = {
      success: true,
      audioUrl: signedUrl,
      storagePath: fileName
    };

    // Save TTS audio clip to dedicated audio table in background (non-blocking)
    EdgeRuntime.waitUntil(
      supabase.from("chat_audio_clips").insert({
        chat_id: chat_id,
        role: "assistant",
        text: text,
        audio_url: signedUrl,
        storage_path: fileName,
        voice: voiceName,
        provider: "google",
        mime_type: "audio/mpeg",
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

    const processingTime = Date.now() - startTime;
    console.log(`[google-tts] TTS completed in ${processingTime}ms`);

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