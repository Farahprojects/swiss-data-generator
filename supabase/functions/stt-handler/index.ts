// supabase/functions/stt-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[stt-handler] Received request");

  if (req.method === "OPTIONS") {
    console.log("[stt-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("[stt-handler] Processing audio blob");
    const audioBlob = await req.blob();

    if (audioBlob.size === 0) {
      console.error("[stt-handler] Received empty audio blob.");
      throw new Error("Received empty audio blob.");
    }
    console.log(`[stt-handler] Received audio blob of size: ${audioBlob.size} bytes`);
    
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    console.log("[stt-handler] Sending request to OpenAI for transcription.");
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    console.log(`[stt-handler] Received response from OpenAI with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[stt-handler] OpenAI API error response: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[stt-handler] Successfully parsed OpenAI response.");
    const transcription = data.text;

    console.log(`[stt-handler] Transcription result: "${transcription}"`);
    console.log("[stt-handler] Sending successful response to client.");

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[stt-handler] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

console.log("[stt-handler] Edge function ready and listening for requests...");