// supabase/functions/tts-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../_shared/config.ts";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const AUDIO_BUCKET = "ChatAudio";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[tts-handler] Received request");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { messageId, text } = await req.json();

    if (!messageId || !text) {
      throw new Error("Missing 'messageId' or 'text' in request body.");
    }

    // 1. Generate audio from OpenAI
    console.log(`[tts-handler] Generating speech for message ${messageId}`);
    const requestBody = { model: "tts-1", input: text, voice: "alloy" };
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    const audioBlob = await response.blob();
    console.log(`[tts-handler] Successfully received audio blob of size: ${audioBlob.size} bytes.`);

    // 2. Upload audio to Supabase Storage
    const audioPath = `${messageId}.mp3`;
    console.log(`[tts-handler] Uploading audio to storage at: ${audioPath}`);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(audioPath, audioBlob, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) {
      console.error("[tts-handler] Error uploading audio to storage:", uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // 3. Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(audioPath);
      
    console.log(`[tts-handler] Audio uploaded. Public URL: ${publicUrl}`);

    // 4. Update the message in the database with the new URL
    console.log(`[tts-handler] Updating message ${messageId} with audio URL.`);
    const { error: dbError } = await supabaseAdmin
      .from('messages')
      .update({ audio_url: publicUrl })
      .eq('id', messageId);

    if (dbError) {
      console.error("[tts-handler] Error updating message with audio URL:", dbError);
      throw new Error(`Failed to update message: ${dbError.message}`);
    }

    // 5. Return the public URL to the client
    console.log("[tts-handler] Process complete. Returning public URL to client.");
    return new Response(JSON.stringify({ audioUrl: publicUrl }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[tts-handler] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
