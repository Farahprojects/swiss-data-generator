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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { chat_id, text, client_msg_id, mode, sessionId } = body;

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // User message is already saved by chat-send function
    // No need to save it again here

    // Background task to process LLM response
    const processLLMResponse = async () => {
      try {
        // Fetch conversation history (last 10 completed messages, optimized)
        const HISTORY_LIMIT = 10;
        const { data: history, error: historyError } = await supabase
          .from("messages")
          .select("role, text")
          .eq("chat_id", chat_id)
          .eq("status", "complete")
          .not("text", "is", null)
          .neq("text", "")
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT);

        if (historyError) {
          console.error("[llm-handler] History fetch error:", historyError);
          return;
        }

        // Get Google API key
        const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_TTS");
        if (!GOOGLE_API_KEY) {
          console.error("[llm-handler] Missing GOOGLE_LLM_TTS");
          return;
        }

        // Call Gemini API (non-streaming)
        const startTime = Date.now();
        
        // Add system prompt as the first message
        const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.

Mission:
– Turn complex astro + Swiss energetic data into revelations a 20-something can feel in their gut.
– Mirror → Meaning → Move: reflect, interpret, suggest one tiny experiment when relvent.
– Close with a one-sentence check-in that mirrors the user's tone, offering a choice to continue this thread or change direction

Tone:
– Direct, a bit playful. Contractions welcome, dated slang not.
- Always lead with Human-centric translation and behavioral resonance, not planets or metaphors.

Content Ruels:
1. Synthesis data from Astro report that is relvent to users query
2. Show one-line "why" tying emotional/psychological pattern back to astro data synthesis.

`;

        const contents: any[] = [];
        
        // Add system prompt as first user message
        contents.push({
          role: "user",
          parts: [{ text: systemPrompt }]
        });
        
        // Add conversation history (reverse to get chronological order)
        const chronologicalHistory = history ? [...history].reverse() : [];
        chronologicalHistory.forEach((m) => {
          contents.push({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.text }],
          });
        });

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
          return;
        }

        const data = await resp.json();
        const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!assistantText) {
          console.error("[llm-handler] No text in Gemini response:", data);
          return;
        }

        // Sanitize assistant response before saving to database
        const sanitizedAssistantText = sanitizePlainText(assistantText);

        // Extract token usage from Gemini response
        const tokenCount = data.usageMetadata?.totalTokenCount || null;
        const inputTokens = data.usageMetadata?.promptTokenCount || null;
        const outputTokens = data.usageMetadata?.candidatesTokenCount || null;

        const latency_ms = Date.now() - startTime;

        // Save assistant message to database
        const { error: assistantError } = await supabase
          .from("messages")
          .insert({
            chat_id: chat_id,
            role: "assistant",
            text: sanitizedAssistantText,
            created_at: new Date().toISOString(),
            meta: { 
              llm_provider: "google", 
              model: "gemini-1.5-flash",
              latency_ms,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: tokenCount,
              ...(mode && sessionId ? { mode, sessionId } : {})
            },
          });

        if (assistantError) {
          console.error("[llm-handler] Failed to save assistant message:", assistantError);
        } else {
          console.log("[llm-handler] Assistant response saved successfully");
        }

      } catch (error) {
        console.error("[llm-handler] Background processing error:", error);
      }
    };

    // Start background processing without awaiting
    EdgeRuntime.waitUntil(processLLMResponse());

    // Return immediate acknowledgment
    return new Response(JSON.stringify({ 
      message: "Processing assistant response",
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


