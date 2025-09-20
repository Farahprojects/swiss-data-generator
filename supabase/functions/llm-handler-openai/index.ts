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

    console.log(`[llm-handler-openai] 🚀 FUNCTION STARTED - chat_id: ${chat_id}, mode: ${mode || 'default'}, text: ${text.substring(0, 50)}...`);

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

    // Fire-and-forget: Fetch conversation history (last 6 completed messages, optimized)
    const HISTORY_LIMIT = 6;
    let history: any[] = [];
    
    supabase
      .from("messages")
      .select("role, text")
      .eq("chat_id", chat_id)
      .eq("status", "complete")
      .not("text", "is", null)
      .neq("text", "")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT)
      .then(({ data: historyData, error: historyError }) => {
        if (historyError) {
          console.error("[llm-handler-openai] Failed to fetch conversation history:", historyError);
        } else {
          history = historyData || [];
        }
      })
      .catch((err) => {
        console.error("[llm-handler-openai] History fetch error:", err);
      });

    // Fire-and-forget: Call OpenAI GPT-4 API
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

    // Fire-and-forget OpenAI API call
    let assistantText = "I'm processing your request...";
    let usage = { total_tokens: null, input_tokens: null, output_tokens: null };
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    fetch(
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
    )
    .then(async (resp) => {
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`OpenAI API request failed: ${resp.status} - ${errorText}`);
      }

      const data = await resp.json();
      assistantText = data.choices?.[0]?.message?.content || "No response text from OpenAI";
      
      // Extract usage metrics from OpenAI response
      usage = {
        total_tokens: data.usage?.total_tokens || null,
        input_tokens: data.usage?.prompt_tokens || null,
        output_tokens: data.usage?.completion_tokens || null,
      };
      
      return { assistantText, usage };
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      console.error("[llm-handler-openai] OpenAI API error:", error);
      assistantText = "Sorry, I encountered an error processing your request.";
    });

    // Sanitize assistant response
    const sanitizedText = sanitizePlainText(assistantText);

    const llmLatency_ms = Date.now() - requestStartTime;
    const totalLatency_ms = Date.now() - requestStartTime;

    // Fire-and-forget TTS call - ONLY for conversation mode
    if (mode === 'conversation') {
      console.log(`[llm-handler-openai] 💬 CONVERSATION MODE: Sending assistant message to chat-send - chat_id: ${chat_id}`);
      
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
      }).catch((err) => {
        console.error('[llm-handler-openai] ❌ TTS call failed:', err);
      });

      // Fire-and-forget chat-send call to save assistant message
      const assistantClientId = crypto.randomUUID();
      console.log(`[llm-handler-openai] 📤 CALLING CHAT-SEND with assistant message - client_msg_id: ${assistantClientId}`);
      
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          chat_id,
          text: sanitizedText,
          client_msg_id: assistantClientId,
          role: 'assistant',
          mode: 'conversation'
        })
      }).then((response) => {
        console.log(`[llm-handler-openai] ✅ CHAT-SEND CALL SUCCESSFUL - status: ${response.status}, client_msg_id: ${assistantClientId}`);
      }).catch((err) => {
        console.error(`[llm-handler-openai] ❌ CHAT-SEND CALL FAILED - client_msg_id: ${assistantClientId}, error:`, err);
      });
    } else {
      // Non-conversation mode - also send to chat-send
      console.log(`[llm-handler-openai] 🤖 NON-CONVERSATION MODE: Sending assistant message to chat-send - chat_id: ${chat_id}`);
      
      const assistantClientId = crypto.randomUUID();
      console.log(`[llm-handler-openai] 📤 CALLING CHAT-SEND with assistant message - client_msg_id: ${assistantClientId}`);
      
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          chat_id,
          text: sanitizedText,
          client_msg_id: assistantClientId,
          role: 'assistant'
        })
      }).then((response) => {
        console.log(`[llm-handler-openai] ✅ CHAT-SEND CALL SUCCESSFUL - status: ${response.status}, client_msg_id: ${assistantClientId}`);
      }).catch((err) => {
        console.error(`[llm-handler-openai] ❌ CHAT-SEND CALL FAILED - client_msg_id: ${assistantClientId}, error:`, err);
      });
    }

    // Non-conversation: assistant is sent to chat-send by LLM itself (above). Return minimal info.
    console.log('[llm-handler-openai] done');
    return new Response(JSON.stringify({ 
      text: sanitizedText,
      usage,
      llm_latency_ms: llmLatency_ms,
      total_latency_ms: totalLatency_ms
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
