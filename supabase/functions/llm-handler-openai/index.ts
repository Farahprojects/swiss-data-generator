import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Create Supabase client once at module scope for better performance
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// Optimized O(n) sanitizer - single pass with minimal regex
function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Single pass: remove markdown and normalize whitespace
  return text
    .replace(/^#{1,6}\s+|[*_]{1,2}([^*_\n]+)[*_]{1,2}|\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|`+([^`\n]*)`+|~~([^~\n]+)~~|[#*_\[\](){}]/g, '$1$2$3')
    .replace(/\s+/g, ' ')
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
    const { chat_id, text, mode } = body;

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("[llm-handler-openai] Missing OPENAI_API_KEY");
      throw new Error("OpenAI API key not configured");
    }

    // Supabase client now created at module scope

    // Fetch conversation history (last 6 completed messages, optimized)
    const HISTORY_LIMIT = 6;
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
      throw new Error("Failed to fetch conversation history");
    }

    // Call OpenAI GPT-4 API
    const requestStartTime = Date.now();
    
    // System prompt
    const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.

Mission:
– Turn complex astro + Swiss energetic data into revelations a 20-something can feel in their gut.
– Close with a one-sentence check-in that mirrors the user's tone, offering a choice to continue this or change 

Tone:
- first line , minimal encourager
– Direct, a bit playful. Contractions welcome, dated slang not.
- Astro jargon not , just energy effect 

Content Rules:
1. Synthesis data from Astro report that is relvent to users query
2. Show one-line "why" tying emotional/psychological pattern back to a core need or fear.
3. Always lead with Human-centric translation and behavioral resonance, not planets or metaphors.
`;

    const messages: any[] = [];
    
    // Add system message
    messages.push({
      role: "system",
      content: systemPrompt
    });
    
    // Add conversation history (iterate in reverse to avoid array allocation)
    if (history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        messages.push({
          role: m.role,
          content: m.text
        });
      }
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: text
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const resp = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini-2025-04-14",
          messages,
          max_tokens: 1000
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`OpenAI API request failed: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json();
    const assistantText = data.choices?.[0]?.message?.content;

    if (!assistantText) {
      throw new Error("No response text from OpenAI");
    }

    // Sanitize assistant response
    const sanitizedText = sanitizePlainText(assistantText);

    // Extract usage metrics from OpenAI response
    const usage = {
      total_tokens: data.usage?.total_tokens || null,
      input_tokens: data.usage?.prompt_tokens || null,
      output_tokens: data.usage?.completion_tokens || null,
    };

    const llmLatency_ms = Date.now() - requestStartTime;
    const totalLatency_ms = Date.now() - requestStartTime;

    // Fire-and-forget TTS call - ONLY for conversation mode
    if (mode === 'conversation') {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          text: sanitizedText,
          voice: 'Puck',
          chat_id: chat_id
        })
      }).catch(() => {}); // Silent error handling

      // Fire-and-forget chat-send call to save assistant message
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          chat_id,
          text: sanitizedText,
          client_msg_id: crypto.randomUUID(),
          role: 'assistant'
        })
      }).catch(() => {}); // Silent error handling
    }

    // Return response with assistant message data for chat-send to save
    console.log('[llm-handler-openai] done');
    return new Response(JSON.stringify({ 
      text: sanitizedText,
      usage,
      llm_latency_ms: llmLatency_ms,
      total_latency_ms: totalLatency_ms,
      assistantMessageData: {
        chat_id,
        role: "assistant",
        text: sanitizedText,
        client_msg_id: crypto.randomUUID(),
        status: "complete",
        meta: { 
          llm_provider: "openai", 
          model: "gpt-4.1-mini-2025-04-14",
          llm_latency_ms: llmLatency_ms,
          total_latency_ms: totalLatency_ms,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          total_tokens: usage.total_tokens,
          mode: mode || 'text'
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
