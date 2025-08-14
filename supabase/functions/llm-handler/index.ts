// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../_shared/config.ts";

const OPENAI_MODEL = "gpt-4o";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MAX_API_RETRIES = 3;
const API_TIMEOUT_MS = 30000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("[llm-handler] Received request");

  if (req.method === "OPTIONS") {
    console.log("[llm-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("[llm-handler] Processing request body");
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[llm-handler] Invalid or empty messages array in request");
      throw new Error("Invalid or empty messages array in request");
    }

    const systemPrompt = { role: "system", content: "You are a helpful assistant." };
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
    };

    console.log(`[llm-handler] Sending request to OpenAI with ${messages.length} messages.`);
    console.log("[llm-handler] OpenAI Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[llm-handler] Received response from OpenAI with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[llm-handler] OpenAI API error response: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[llm-handler] Successfully parsed OpenAI response.");
    const assistantResponse = data.choices[0].message.content;

    console.log("[llm-handler] Sending successful response to client.");
    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[llm-handler] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
