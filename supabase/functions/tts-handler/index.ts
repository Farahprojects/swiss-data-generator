// supabase/functions/tts-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { OPENAI_API_KEY } from "../_shared/config.ts";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/speech";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { text } = await req.json();

    const requestBody = {
      model: "tts-1",
      input: text,
      voice: "alloy",
    };

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
    
    return new Response(audioBlob, {
      headers: { ...CORS_HEADERS, "Content-Type": "audio/mpeg" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
