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
          console.error("[llm-handler-openai] History fetch error:", historyError);
          return;
        }

        // Get OpenAI API key
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) {
          console.error("[llm-handler-openai] Missing OPENAI_API_KEY");
          return;
        }

        // Call OpenAI GPT-4 API
        const startTime = Date.now();
        
        // System prompt
        const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.

Mission:
– Turn complex astro + Swiss energetic data into revelations a 20-something can feel in their gut.
– Mirror → Meaning → Move: reflect, interpret, suggest one tiny experiment when relvent.
– Close with a one-sentence check-in that mirrors the user's tone, offering a choice to continue this thread or change direction

Tone:
– Direct, a bit playful. Contractions welcome, dated slang not.

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
          return;
        }

        const data = await resp.json();
        const assistantText = data.choices?.[0]?.message?.content;

        if (!assistantText) {
          console.error("[llm-handler-openai] No text in OpenAI response:", data);
          return;
        }

        // Sanitize assistant response before saving to database
        const sanitizedAssistantText = sanitizePlainText(assistantText);

        // Extract token usage from OpenAI response
        const tokenCount = data.usage?.total_tokens || null;
        const inputTokens = data.usage?.prompt_tokens || null;
        const outputTokens = data.usage?.completion_tokens || null;

        const latency_ms = Date.now() - startTime;

        // Save assistant message to database (fire-and-forget)
        supabase
          .from("messages")
          .insert({
            chat_id: chat_id,
            role: "assistant",
            text: sanitizedAssistantText,
            created_at: new Date().toISOString(),
            meta: { 
              llm_provider: "openai", 
              model: "gpt-4.1-mini-2025-04-14",
              latency_ms,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: tokenCount,
              mode: mode || null,
              sessionId: sessionId || null
            },
          })
          .then(({ error: assistantError }) => {
            if (assistantError) {
              console.error("[llm-handler-openai] Failed to save assistant message:", assistantError);
            }
          })
          .catch(error => {
            console.error("[llm-handler-openai] Database save error:", error);
          });
          
        // �� CONVERSATION MODE: Fire-and-forget TTS call
        if (mode === 'conversation' && chat_id) {
          // Call TTS WebSocket service (fire-and-forget)
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-text-to-speech`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              text: sanitizedAssistantText,
              voice: 'Puck',
              chat_id: chat_id
            })
          })
          .then(() => {
            console.log(`[llm-handler-openai] Google TTS request sent for chat_id ${chat_id}`);
          })
          .catch(error => {
            console.error(`[llm-handler-openai] Google TTS request failed for chat_id ${chat_id}:`, error);
          });
        }

      } catch (error) {
        console.error("[llm-handler-openai] Background processing error:", error);
      }
    };

    // Start background processing without awaiting
    const processPromise = processLLMResponse();
    EdgeRuntime.waitUntil(processPromise);

    // For conversation mode, we need to wait for the response and return it
    if (mode === 'conversation') {
      try {
        await processPromise;
        // Get the assistant response for frontend TTS
        const { data: latestMessage } = await supabase
          .from("messages")
          .select("text")
          .eq("chat_id", chat_id)
          .eq("role", "assistant")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        return new Response(JSON.stringify({ 
          message: "Assistant response ready",
          text: latestMessage?.text || "",
          client_msg_id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[llm-handler-openai] Error getting assistant response:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to get assistant response",
          client_msg_id
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Return immediate acknowledgment for non-conversation modes
    return new Response(JSON.stringify({ 
      message: "Processing assistant response",
      client_msg_id
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
