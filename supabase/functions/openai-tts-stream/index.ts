// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Function to convert a ReadableStream of Uint8Array to a stream of Base64 strings
async function* streamToBase64(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const { toByteArray } = await import("https://deno.land/x/fast_base64@v0.1.2/mod.ts");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        yield toByteArray(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, voice = "alloy", chat_id, sessionId } = await req.json();

    if (!text || !chat_id || !sessionId) {
      throw new Error("Missing one of the required fields: text, chat_id, sessionId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const processStream = async () => {
      try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
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
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("OpenAI TTS API error:", errorBody);
          throw new Error(`OpenAI TTS API request failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body from OpenAI TTS API");
        }
        
        const channel = supabase.channel(`tts-stream:${sessionId}`);

        // Start broadcasting chunks
        for await (const base64Chunk of streamToBase64(response.body)) {
          await channel.send({
            type: "broadcast",
            event: "audio-chunk",
            payload: { chunk: base64Chunk },
          });
        }

        // Signal end of stream
        await channel.send({
          type: "broadcast",
          event: "audio-stream-end",
          payload: {},
        });

        await supabase.removeChannel(channel);

      } catch (e) {
        console.error("Error in streaming process:", e);
      }
    };

    // Run the streaming process in the background.
    // Deno.env.get("EdgeRuntime").waitUntil(processStream());
    await processStream()

    return new Response(JSON.stringify({ message: "TTS stream initiated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Main function error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
