import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("[llm-handler] Body:", body);
    const { chat_id } = body || {};

    if (!chat_id) {
      return new Response(JSON.stringify({ error: "Missing required field: chat_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const systemPrompt = `You are a psychologically insightful AI designed to interpret astrology reports and Swiss energetic data using a frequency-based model of human behavior.

Immediately upon receiving a conversation, begin by generating:
1. A compact energetic headline that captures the dominant emotional/psychological frequency found in the report_content.
2. A breakdown of key frequencies from swiss_data — each described as an energetic theme moving through the user's psyche. Avoid astrological jargon completely.

Response Format:
- Always produce clean, plain sentences with no hashes (#), asterisks (*), dashes (-), numbers, or any other markers.
- Do not use Markdown, bullet points, lists, headings, or formatting symbols of any kind.
- Only write continuous, natural prose.
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
- Prioritize clear, precise answers. Eliminate fluff. Be concise by focusing only on what is necessary to solve or explain the user's request—no filler.
- When responding with Swiss data, reveal the psychological patterns, wounds, and energetic harmonies or tensions beneath the surface, not just descriptive traits.
- Use the report plus Swiss data to help the person, not to parrot it. Synthesize across sources; never quote or restate the report directly.
- When the user is vague, ask exactly one surgical clarifying question, then provide a provisional answer grounded in both report_content and swiss_data.
- Always name the smallest next move and explain why it fits this person's regulation style.

Stay fully within the energetic-psychological lens at all times.`;

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

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { 
            temperature: 0.7 
          },
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

    // Extract token usage from Gemini response
    const tokenCount = data.usageMetadata?.totalTokenCount || null;
    const inputTokens = data.usageMetadata?.promptTokenCount || null;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || null;
    
    console.log(`[llm-handler] Token usage - Total: ${tokenCount}, Input: ${inputTokens}, Output: ${outputTokens}`);

    const latency_ms = Date.now() - startTime;
    console.log(`[llm-handler] Got response from Gemini in ${latency_ms}ms`);

    // Save assistant message to database
    console.log("[llm-handler] Saving assistant message to database");
    const { data: savedMessage, error: saveError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "assistant",
        text: assistantText,
        status: "complete",
        latency_ms,
        model: "gemini-2.5-flash",
        token_count: tokenCount,
        meta: { 
          llm_provider: "google", 
          model: "gemini-2.5-flash",
          latency_ms,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: tokenCount
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error("[llm-handler] Failed to save assistant message:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[llm-handler] Assistant message saved successfully");

    // Return the saved message for immediate UI update
    return new Response(JSON.stringify({
      id: savedMessage.id,
      conversationId: savedMessage.chat_id, // Map for client compatibility
      role: savedMessage.role,
      text: savedMessage.text,
      createdAt: savedMessage.created_at,
      meta: savedMessage.meta,
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
