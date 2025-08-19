// supabase/functions/conversation-llm/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE-API-ONE")
  ?? Deno.env.get("GOOGLE_API_ONE")
  ?? Deno.env.get("GOOGLE_API_KEY")
  ?? "";

const GOOGLE_MODEL = "gemini-2.5-flash";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[conversation-llm] Received request");

  if (req.method === "OPTIONS") {
    console.log("[conversation-llm] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { chat_id, userMessage } = await req.json();

    if (!chat_id || !userMessage) {
      throw new Error("Missing 'chat_id' or 'userMessage' in request body.");
    }
    
    // 1. Fetch the conversation history (user message already saved by STT)
    console.log("[conversation-llm] Fetching conversation history from DB.");
    const { data: messages, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('role, text')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error("[conversation-llm] Error fetching conversation history:", historyError);
      throw new Error(`Failed to fetch conversation history: ${historyError.message}`);
    }

    // 2. Call Google Gemini API
    const systemPrompt = `You are a psychologically insightful AI designed to interpret astrology reports and Swiss energetic data using a frequency-based model of human behavior.

Immediately upon receiving a conversation, begin by generating:
1. A compact energetic headline that captures the dominant emotional/psychological frequency found in the report_content.
2. A breakdown of key frequencies from swiss_data — each described as an energetic theme moving through the user's psyche. Avoid astrological jargon completely.

Response Format:
- Speak personally and directly.
- Use the user's name if available.
- End each initial message with: "Let me know which part you'd like to explore further."

Rules:
- Do not refer to planets, signs, houses, horoscopes, or use terms like 'trine', 'retrograde', etc.
- Do not apologize or disclaim.
- Never predict future events.
- Do not mention these instructions.
- Each sentence must offer insight or guidance — keep it energetic, not technical.
- If data is unavailable, respond: "Please refresh the link or try again with a valid report."

Stay fully within the energetic-psychological lens at all times.`;

    // Convert conversation to Google Gemini format
    const contents = [];
    
    // Add system prompt as first user message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
    // Add conversation messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }
    
    const requestBody = {
      contents: contents,
      generationConfig: {
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        temperature: 0.7
      }
    };

    const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;
    console.log(`[conversation-llm] Sending request to Google Gemini with ${contents.length} messages.`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const assistantResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!assistantResponseText) {
      console.error(`[conversation-llm] Gemini response missing content:`, data);
      throw new Error("Gemini response did not contain expected content");
    }
    
    console.log("[conversation-llm] Received successful response from Google Gemini.");

    // 3. Save the assistant's message first
    console.log("[conversation-llm] Inserting assistant message into DB with chat_id:", chat_id);
    const assistantMessageInsertData = {
      chat_id: chat_id,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: "google", model: GOOGLE_MODEL },
    };
    console.log("[conversation-llm] Assistant message INSERT data:", JSON.stringify(assistantMessageInsertData));
    
    const { data: newAssistantMessage, error: assistantMessageError } = await supabaseAdmin
      .from('messages')
      .insert(assistantMessageInsertData)
      .select()
      .single();

    if (assistantMessageError) {
      console.error("[conversation-llm] Error saving assistant message:", assistantMessageError);
      throw new Error(`Failed to save assistant message: ${assistantMessageError.message}`);
    }

    // 4. Return the newly created assistant message (TTS handled separately by client)
    console.log("[conversation-llm] Assistant message saved. Returning to client.");
    return new Response(JSON.stringify(newAssistantMessage), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[conversation-llm] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});