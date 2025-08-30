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
      const { text, voice = "alloy", chat_id, sessionId } = await req.json();
      
      if (!text || !chat_id || !sessionId) {
        return new Response(JSON.stringify({ error: "Missing required fields: text, chat_id, sessionId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log(`[TTS] HTTP POST request for session: ${sessionId}, text length: ${text.length}`);

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

      console.log(`[TTS] TTS response received, storing in temp_audio table for session ${sessionId}`);
      
      // Read the entire MP3 response
      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBytes = new Uint8Array(audioBuffer);
      
      try {
        // Upsert audio data into temp_audio table
        const { error: upsertError } = await supabase
          .from('temp_audio')
          .upsert({
            session_id: sessionId,
            audio_data: audioBytes,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });
        
        if (upsertError) {
          console.error(`[TTS] Failed to upsert audio data for session ${sessionId}:`, upsertError);
          return new Response(JSON.stringify({ 
            error: `Failed to store audio data: ${upsertError.message}` 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        console.log(`[TTS] ✅ Audio data stored in temp_audio table for session ${sessionId}, ${audioBytes.length} bytes`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "TTS audio stored successfully",
          bytes: audioBytes.length
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (dbError) {
        console.error(`[TTS] Database error for session ${sessionId}:`, dbError);
        return new Response(JSON.stringify({ error: "Database operation failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      console.error("[TTS] HTTP POST error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Return 404 for all other requests
  return new Response("Not found", { status: 404 });
});