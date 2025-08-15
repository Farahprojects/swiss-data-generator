import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[google-tts] Received request");

  if (req.method === "OPTIONS") {
    console.log("[google-tts] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { messageId, text } = await req.json();

    if (!messageId || !text) {
      throw new Error("Missing 'messageId' or 'text' in request body.");
    }

    console.log(`[google-tts] Processing TTS for messageId: ${messageId}`);

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
            name: "en-US-Neural2-F", // Female neural voice
            ssmlGender: "FEMALE"
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0
          }
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error(`[google-tts] Google TTS API error: ${ttsResponse.status} - ${errorText}`);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    console.log("[google-tts] Successfully received audio from Google TTS");

    // Convert base64 audio to blob
    const audioBase64 = ttsData.audioContent;
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });

    // Upload to Supabase Storage
    const fileName = `${messageId}-${Date.now()}.mp3`;
    console.log(`[google-tts] Uploading audio to storage: ${fileName}`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ChatAudio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    let audioUrl: string;

    if (uploadError) {
      console.error("[google-tts] Storage upload error:", uploadError);
      console.log("[google-tts] Falling back to data URL approach");
      
      // Fallback: create a data URL for direct audio playback
      const base64DataUrl = `data:audio/mpeg;base64,${audioBase64}`;
      audioUrl = base64DataUrl;
      console.log("[google-tts] Using data URL fallback for audio");
    } else {
      // Get public URL from storage
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('ChatAudio')
        .getPublicUrl(fileName);

      audioUrl = publicUrl;
      console.log(`[google-tts] Audio uploaded successfully: ${publicUrl}`);
    }

    // Update message with audio URL
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ 
        audio_url: audioUrl,
        meta: { 
          tts_provider: "google",
          voice: "en-US-Neural2-F",
          audio_format: "mp3"
        }
      })
      .eq('id', messageId);

    if (updateError) {
      console.error("[google-tts] Database update error:", updateError);
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    console.log("[google-tts] Successfully updated message with audio URL");

    return new Response(JSON.stringify({ audioUrl: audioUrl }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[google-tts] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
