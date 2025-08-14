// supabase/functions/tts-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { OPENAI_API_KEY } from "../_shared/config.ts";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/speech";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[tts-handler] Received request");

  if (req.method === "OPTIONS") {
    console.log("[tts-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("[tts-handler] Processing request body");
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error("[tts-handler] Invalid or empty text in request");
      throw new Error("Invalid or empty text in request");
    }

    console.log(`[tts-handler] Generating speech for text: "${text}"`);

    const requestBody = {
      model: "tts-1",
      input: text,
      voice: "alloy",
    };

    console.log("[tts-handler] Sending request to OpenAI for speech synthesis.");
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[tts-handler] Received response from OpenAI with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[tts-handler] OpenAI API error response: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const audioBlob = await response.blob();
    console.log(`[tts-handler] Successfully received audio blob of size: ${audioBlob.size} bytes.`);
    
    console.log("[tts-handler] Sending successful audio response to client.");
    return new Response(audioBlob, {
      headers: { ...CORS_HEADERS, "Content-Type": "audio/mpeg" },
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
