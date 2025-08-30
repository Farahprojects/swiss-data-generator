
// OpenAI TTS service - Using temp_audio table for audio storage
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

serve(async (req) => {
  const { headers } = req;

  // Handle HTTP POST requests from LLM handler
  if (req.method === "POST") {
    try {
      const { text, voice = "alloy", chat_id } = await req.json();
      
      if (!text || !chat_id) {
        return new Response(JSON.stringify({ error: "Missing required fields: text, chat_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log(`[TTS] HTTP POST request for chat: ${chat_id}, text length: ${text.length}`);

      // Call OpenAI TTS API
      const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: voice,
          response_format: "mp3",
          speed: 1.0,
        }),
      });

      if (!ttsResponse.ok) {
        const errorBody = await ttsResponse.text();
        console.error("[TTS] OpenAI TTS API error:", errorBody);
        return new Response(JSON.stringify({ 
          error: `TTS API failed: ${ttsResponse.status}` 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!ttsResponse.body) {
        return new Response(JSON.stringify({ error: "No response body from TTS API" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log(`[TTS] TTS response received, storing in temp_audio table for chat ${chat_id}`);
      
      // Read the entire MP3 response
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBytes = new Uint8Array(audioBuffer);
      
      try {
        // Convert Uint8Array to base64 in chunks to avoid stack overflow
        let base64Audio = '';
        const chunkSize = 32768; // 32KB chunks
        for (let i = 0; i < audioBytes.length; i += chunkSize) {
          const chunk = audioBytes.slice(i, i + chunkSize);
          base64Audio += btoa(String.fromCharCode(...chunk));
        }
        
        console.log(`[TTS] Attempting upsert for chat: ${chat_id}`);
        
        // Atomic upsert - insert if missing, update if exists
        const { error: upsertError, data: upsertData } = await supabase
          .from('temp_audio')
          .upsert({
            session_id: chat_id,
            audio_data: base64Audio,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });
        
        console.log(`[TTS] Upsert result for chat ${chat_id}:`, { 
          error: upsertError, 
          data: upsertData,
          chat_id: chat_id 
        });
        
        if (upsertError) {
          console.error(`[TTS] Failed to upsert audio data for chat ${chat_id}:`, {
            error: upsertError,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            code: upsertError.code
          });
          return new Response(JSON.stringify({ 
            error: `Failed to store audio data: ${upsertError.message}`,
            details: upsertError.details
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        console.log(`[TTS] ✅ Audio data stored in temp_audio table for chat ${chat_id}, ${audioBytes.length} bytes (${base64Audio.length} base64 chars)`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "TTS audio stored successfully",
          bytes: audioBytes.length,
          base64Length: base64Audio.length
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (dbError) {
        console.error(`[TTS] Database error for chat ${chat_id}:`, {
          error: dbError,
          message: dbError.message,
          stack: dbError.stack
        });
        return new Response(JSON.stringify({ 
          error: "Database operation failed",
          details: dbError.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      console.error("[TTS] HTTP POST error:", {
        error: error,
        message: error.message,
        stack: error.stack
      });
      return new Response(JSON.stringify({ 
        error: error.message,
        details: "Unhandled error in TTS processing"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Return 404 for all other requests
  return new Response("Not found", { status: 404 });
});
