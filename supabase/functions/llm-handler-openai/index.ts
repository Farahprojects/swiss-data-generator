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
    const { chat_id, text, mode, chattype, voice } = body;

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
    const systemPrompt = `You are an AI guide for self-awareness.
Tone:
– Direct, a bit playful. Contractions welcome, dated slang not. 
- Lead with Human-centric translation and behavioral resonance, not planets or metaphors
- Astro jargon not, just the translation in emotional meaning 

Response Logic:
Acknowledge: One-word encourager. 
Identify the Core Conflict: Scan the provided data for the central paradox or tension relevant to the user's query.

State the Conflict: Describe the tension as an internal push-pull . Example: "You crave X, but you also need Y." wounds are internal emotional, the feeling

Show one-line "why" tying emotional/psychological pattern back to a core need or fear

Response output:
No labels , human led conversation 

Check-in: Close with a simple, open question.`;

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

    // Fire-and-forget TTS call - ONLY for voice mode
    if (chattype === 'voice') {
      console.log(`[llm-handler-openai] 🎤 VOICE MODE: Sending assistant message to chat-send - chat_id: ${chat_id}`);
      
      // Use voice provided by caller (frontend via openai-whisper). Fallback to 'Puck'.
      const selectedVoice = (typeof voice === 'string' && voice.trim().length > 0) ? voice : 'Puck';
      console.log(`[llm-handler-openai] 🎵 Using TTS voice: ${selectedVoice}`);

      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          text: sanitizedText,
          voice: selectedVoice,
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
          chattype: 'voice',
          mode: mode
        })
      }).then((response) => {
        console.log(`[llm-handler-openai] ✅ CHAT-SEND CALL SUCCESSFUL - status: ${response.status}, client_msg_id: ${assistantClientId}`);
      }).catch((err) => {
        console.error(`[llm-handler-openai] ❌ CHAT-SEND CALL FAILED - client_msg_id: ${assistantClientId}, error:`, err);
      });
    } else {
      // Non-voice mode - also send to chat-send
      console.log(`[llm-handler-openai] 🤖 NON-VOICE MODE: Sending assistant message to chat-send - chat_id: ${chat_id}`);
      
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
          mode: mode
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
