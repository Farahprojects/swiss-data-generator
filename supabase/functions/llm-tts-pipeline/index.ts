// supabase/functions/llm-tts-pipeline/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chat_id, transcript } = await req.json();
    if (!chat_id || !transcript) {
      throw new Error("Missing chat_id or transcript in the request body.");
    }

    console.log(`[llm-tts-pipeline] Started for chat_id: ${chat_id}`);

    // Get a unique channel for this conversation
    const channel = supabaseAdmin.channel(`conversation:${chat_id}`);

    // 1. Generate LLM Text
    const { assistantText, metadata } = await generateLlmText(chat_id, transcript);
    
    // 2. Broadcast the text to the client
    await channel.send({
      type: 'broadcast',
      event: 'text_final',
      payload: { 
        text: assistantText,
        id: `temp-text-${Date.now()}`,
        ...metadata 
      },
    });
    console.log(`[llm-tts-pipeline] Broadcasted 'text_final'`);

    // 3. Generate TTS Audio from the text
    const audioArrayBuffer = await generateTtsAudio(assistantText);
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));

    // 4. Broadcast the audio to the client
    await channel.send({
      type: 'broadcast',
      event: 'audio_final',
      payload: { 
        audio: audioBase64,
        id: `temp-audio-${Date.now()}`
      },
    });
    console.log(`[llm-tts-pipeline] Broadcasted 'audio_final'`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[llm-tts-pipeline] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateLlmText(chat_id: string, userText: string): Promise<{ assistantText: string; metadata: any }> {
  // This function would contain the logic to call the Gemini API
  // For now, it's simplified but would be filled with the full logic
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_TTS")!;
  // Fetch history, construct prompt etc.
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a helpful assistant. The user said: "${userText}". Respond.` }] }]
      }),
  });
  if (!resp.ok) throw new Error("LLM API call failed");
  const data = await resp.json();
  const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!assistantText) throw new Error("No text from LLM");
  return { assistantText, metadata: {} };
}

async function generateTtsAudio(text: string): Promise<ArrayBuffer> {
  // This function calls the tts-speak function internally
  const ttsResponse = await fetch(`${SUPABASE_URL}/functions/v1/tts-speak`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ text })
  });
  if (!ttsResponse.ok) throw new Error("TTS function call failed");
  return ttsResponse.arrayBuffer();
}
