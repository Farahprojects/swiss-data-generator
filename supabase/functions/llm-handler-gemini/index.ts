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

    console.log(`[llm-handler-gemini] 🚀 FUNCTION STARTED - chat_id: ${chat_id}, mode: ${mode || 'default'}, text: ${typeof text === 'string' ? text.substring(0, 50) : ''}...`);

    if (!chat_id || !text) {
      throw new Error("Missing 'chat_id' or 'text' in request body.");
    }

    

    // Get Google API key
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_1");
    if (!GOOGLE_API_KEY) {
      console.error("[llm-handler-gemini] Missing GOOGLE_LLM_1");
      throw new Error("Google API key not configured");
    }
    

    // Fetch conversation history (last 6 completed non-system messages)
    const HISTORY_LIMIT = 6;
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, text")
      .eq("chat_id", chat_id)
      .eq("status", "complete")
      .neq("role", "system")
      .not("text", "is", null)
      .neq("text", "")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (historyError) {
      console.error(`[llm-handler-gemini] ❌ History fetch error:`, historyError);
      throw new Error("Failed to fetch conversation history");
    }

    // Fetch earliest system message (astro data) for this chat
    const { data: systemRows, error: systemError } = await supabase
      .from("messages")
      .select("text, created_at")
      .eq("chat_id", chat_id)
      .eq("role", "system")
      .not("text", "is", null)
      .neq("text", "")
      .order("created_at", { ascending: true })
      .limit(1);

    if (systemError) {
      console.error(`[llm-handler-gemini] ❌ System message fetch error:`, systemError);
    }
    const systemText = systemRows && systemRows.length > 0 ? String(systemRows[0].text) : null;

    // Log what we fetched for verification
    console.log(
      `[llm-handler-gemini] 📥 History fetched (excluding system): count=${history?.length ?? 0}, roles(newest→oldest)=${(history || [])
        .map(m => m.role)
        .join(', ')}`
    );
    console.log(
      `[llm-handler-gemini] 📥 System message present=${Boolean(systemText)}, chars=${systemText ? systemText.length : 0}, preview="${systemText ? systemText.substring(0, 140) : ''}"`
    );
    

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

    // Build Gemini contents array from history
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    if (history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        const role = m.role === 'assistant' ? 'model' : 'user';
        if (typeof m.text === 'string' && m.text.trim().length > 0) {
          contents.push({ role, parts: [{ text: m.text }] });
        }
      }
    }

    // Add current user message
    contents.push({ role: 'user', parts: [{ text: String(text) }] });

    // Log what will be sent in contents
    console.log(
      `[llm-handler-gemini] 📤 Contents prepared: count=${contents.length}, roles(oldest→newest)=${contents.map(c => c.role).join(', ')}`
    );

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Call Google Generative Language API (Gemini)
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const combinedSystemInstruction = systemText
      ? `${systemPrompt}\n\n[System Data]\n${systemText}`
      : systemPrompt;

    const requestBody = {
      system_instruction: { role: 'system', parts: [{ text: combinedSystemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.7,
      },
    };

    console.log(
      `[llm-handler-gemini] 📤 Sending to Gemini: system_chars=${combinedSystemInstruction.length}, contents_count=${contents.length}`
    );
    
    

    const resp = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`[llm-handler-gemini] ❌ Gemini API Error:`, errorText);
      throw new Error(`Gemini API request failed: ${resp.status} - ${errorText}`);
    }

    const data = await resp.json();

    // Extract assistant text from Gemini response
    let assistantText = '';
    try {
      const parts = data?.candidates?.[0]?.content?.parts || [];
      assistantText = parts.map((p: { text?: string }) => p?.text).filter(Boolean).join(' ').trim();
      console.log(`[llm-handler-gemini] ✅ Extracted text: ${assistantText.substring(0, 50)}...`);
    } catch (err) {
      console.error(`[llm-handler-gemini] ❌ Error extracting text from response:`, err);
      // fall through to validation below
    }

    if (!assistantText) {
      console.error(`[llm-handler-gemini] ❌ No response text from Gemini`);
      throw new Error("No response text from Gemini");
    }

    // Sanitize assistant response
    const sanitizedText = sanitizePlainText(assistantText);

    // Extract usage metrics from Gemini response
    const usage = {
      total_tokens: data?.usageMetadata?.totalTokenCount ?? null,
      input_tokens: data?.usageMetadata?.promptTokenCount ?? null,
      output_tokens: data?.usageMetadata?.candidatesTokenCount ?? null,
    };

    const llmLatency_ms = Date.now() - requestStartTime;
    const totalLatency_ms = Date.now() - requestStartTime;

    

    // Fire-and-forget TTS call - ONLY for voice mode
    if (chattype === 'voice') {
      const selectedVoice = (typeof voice === 'string' && voice.trim().length > 0) ? voice : 'Puck';

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
        console.error('[llm-handler-gemini] ❌ TTS call failed:', err);
      });

      // Fire-and-forget chat-send call to save assistant message
      const assistantClientId = crypto.randomUUID();
      console.log(`[llm-handler-gemini] 📤 CALLING CHAT-SEND with assistant message - client_msg_id: ${assistantClientId}`);

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
        console.log(`[llm-handler-gemini] ✅ CHAT-SEND CALL SUCCESSFUL - status: ${response.status}, client_msg_id: ${assistantClientId}`);
      }).catch((err) => {
        console.error(`[llm-handler-gemini] ❌ CHAT-SEND CALL FAILED - client_msg_id: ${assistantClientId}, error:`, err);
      });
    } else {
      // Non-voice mode - also send to chat-send

      const assistantClientId = crypto.randomUUID();
      console.log(`[llm-handler-gemini] 📤 CALLING CHAT-SEND with assistant message - client_msg_id: ${assistantClientId}`);

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
        console.log(`[llm-handler-gemini] ✅ CHAT-SEND CALL SUCCESSFUL - status: ${response.status}, client_msg_id: ${assistantClientId}`);
      }).catch((err) => {
        console.error(`[llm-handler-gemini] ❌ CHAT-SEND CALL FAILED - client_msg_id: ${assistantClientId}, error:`, err);
      });
    }

    console.log('[llm-handler-gemini] ✅ Function completed successfully');
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
      error: (error as Error)?.message ?? String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


