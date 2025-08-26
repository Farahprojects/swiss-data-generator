import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sanitize text to remove markdown, formatting tokens, and unwanted characters
function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Remove markdown headers (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers (* ** _)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    // Remove brackets and parentheses with content
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    // Remove curly braces
    .replace(/\{[^}]*\}/g, '')
    // Remove remaining special characters
    .replace(/[#*_\[\](){}]/g, '')
    // Remove backticks for code
    .replace(/`+([^`]*)`+/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Normalize whitespace - replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log(`[llm-handler] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[llm-handler] Request body:", body);
    
    const { chat_id, text, client_msg_id, mode, sessionId } = body;

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }

    console.log(`[llm-handler] Processing request - chat_id: ${chat_id}, mode: ${mode || 'normal'}, sessionId: ${sessionId || 'none'}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    console.log("[llm-handler] Supabase client created");

    // Fetch conversation history for context
    console.log("[llm-handler] Fetching conversation history");
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, text")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true })
      .limit(30);

    if (historyError) {
      console.error("[llm-handler] History fetch error:", historyError);
      return new Response(JSON.stringify({ error: "Failed to load history" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[llm-handler] Found ${history?.length || 0} messages in history`);

    // Get Google API key
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_TTS");
    if (!GOOGLE_API_KEY) {
      console.error("[llm-handler] Missing GOOGLE_LLM_TTS");
      return new Response(JSON.stringify({ error: "LLM service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Gemini API (non-streaming)
    console.log("[llm-handler] Calling Gemini API");
    const startTime = Date.now();
    
    // Add system prompt as the first message
    const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.

Mission:
– Turn complex astro + Swiss energetic data into revelations a 20-something can feel in their gut.
– Mirror → Meaning → Move: reflect, interpret, suggest one tiny experiment when relvent.
– Close with a one-sentence check-in that mirrors the user's tone, offering a choice to continue this thread or change direction

Tone:
– Friendly, direct, a bit playful. Contractions welcome, dated slang not.
– Depth over length, but allow a short story or metaphor when it lands harder than a bullet list.

Rules:
1. Synthesis data from Astro report that is relvent to users query
2. Show one-line "why" links to the data when relevant.
3. CRITICAL: Never use hash symbols, asterisks, dashes, brackets, parentheses, curly braces, or any markdown formatting in your response. Write in plain text only.
4. Do not use bold, italic, code blocks, lists with bullets or numbers, or any special formatting.
5. Write naturally in paragraphs using only letters, numbers, basic punctuation (periods, commas, question marks, exclamation points), and spaces.
`;



    const contents: any[] = [];
    
    // Add system prompt as first user message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
    // Add conversation history
    (history || []).forEach((m) => {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      });
    });

    // Add current user message if provided (from STT transcript or text input)
    if (text) {
      contents.push({
        role: "user",
        parts: [{ text: text }],
      });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { 
            temperature: 0.4 
          }
        }),
      }
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("[llm-handler] Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json();
    const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!assistantText) {
      console.error("[llm-handler] No text in Gemini response:", data);
      throw new Error("No response text from Gemini");
    }

    // Sanitize assistant response before saving to database
    const sanitizedAssistantText = sanitizePlainText(assistantText);
    
    console.log(`[llm-handler] Text sanitization:`, {
      original_length: assistantText.length,
      sanitized_length: sanitizedAssistantText.length,
      changed: assistantText !== sanitizedAssistantText
    });

    // Extract token usage from Gemini response
    const tokenCount = data.usageMetadata?.totalTokenCount || null;
    const inputTokens = data.usageMetadata?.promptTokenCount || null;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || null;
    
    console.log(`[llm-handler] Token usage - Total: ${tokenCount}, Input: ${inputTokens}, Output: ${outputTokens}`);

    const latency_ms = Date.now() - startTime;
    console.log(`[llm-handler] Got response from Gemini in ${latency_ms}ms`);

    // Save assistant message to database and get the real ID
    const { data: savedMessage, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chat_id,
        role: "assistant",
        text: sanitizedAssistantText, // Save sanitized text to DB
        created_at: new Date().toISOString(),
        meta: { 
          llm_provider: "google", 
          model: "gemini-1.5-flash",
          latency_ms,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: tokenCount
        },
      })
      .select()
      .single();

    if (error) {
      console.error("[llm-handler] Failed to save assistant message:", error);
      throw new Error(`Failed to save message: ${error.message}`);
    }

    console.log("[llm-handler] Assistant message saved successfully with ID:", savedMessage.id);

    // ✅ REMOVED: Server-side TTS - keeping client-side TTS flow only
    // ChatController already calls conversationTtsService.speakAssistant

    // Return the saved message with the real ID
    return new Response(JSON.stringify({ 
      ...savedMessage,
      client_msg_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[llm-handler] Error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


