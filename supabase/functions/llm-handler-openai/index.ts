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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

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
      console.error("[llm-handler-openai] History fetch error:", historyError);
      throw new Error("Failed to fetch conversation history");
    }

    // Call OpenAI GPT-4 API
    const startTime = Date.now();
    
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
    
    // Add conversation history (reverse to get chronological order)
    const chronologicalHistory = history ? [...history].reverse() : [];
    chronologicalHistory.forEach((m) => {
      messages.push({
        role: m.role,
        content: m.text
      });
    });

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
          max_completion_tokens: 1000
        }),
      }
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("[llm-handler-openai] OpenAI API error:", errorText);
      throw new Error(`OpenAI API request failed: ${resp.status}`);
    }

    const data = await resp.json();
    const assistantText = data.choices?.[0]?.message?.content;

    if (!assistantText) {
      console.error("[llm-handler-openai] No text in OpenAI response:", data);
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

    const latency_ms = Date.now() - startTime;

    // Don't save to DB - let chat-send handle that
    console.log('[llm-handler-openai] 📤 Returning response to chat-send for DB saving...');

    // Fire-and-forget TTS call - ONLY for conversation mode
    if (mode === 'conversation') {
      console.log('[llm-handler-openai] 🎵 Starting TTS service (conversation mode)...');
      EdgeRuntime.waitUntil(
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
        }).then(async (ttsResponse) => {
          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('[llm-handler-openai] ❌ TTS service failed:', errorText);
          } else {
            console.log('[llm-handler-openai] ✅ TTS completed in background');
          }
        }).catch((error) => {
          console.error('[llm-handler-openai] ❌ TTS service error:', error);
        })
      );
    } else {
      console.log('[llm-handler-openai] 🚫 Skipping TTS - not conversation mode (mode:', mode, ')');
    }

    // Return response with assistant message data for chat-send to save
    return new Response(JSON.stringify({ 
      text: sanitizedText,
      usage,
      latency_ms,
      assistantMessageData: {
        chat_id,
        role: "assistant",
        text: sanitizedText,
        client_msg_id: crypto.randomUUID(),
        status: "complete",
        meta: { 
          llm_provider: "openai", 
          model: "gpt-4.1-mini-2025-04-14",
          latency_ms,
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
    console.error("[llm-handler-openai] Error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
