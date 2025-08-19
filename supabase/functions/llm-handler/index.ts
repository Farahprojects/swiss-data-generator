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
    const { chat_id, k = 30 } = body || {};

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

    // Fetch recent messages for context
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, text")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true })
      .limit(k);

    if (historyError) {
      console.error("[llm-handler] History fetch error:", historyError);
      return new Response(JSON.stringify({ error: "Failed to load history" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create provisional assistant message
    const { data: assistantMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "assistant",
        text: "",
        status: "streaming",
        model: "gemini-2.5-flash",
        meta: {},
      })
      .select("id")
      .single();

    if (insertError || !assistantMessage) {
      console.error("[llm-handler] Failed to create provisional assistant message:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create assistant message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      console.error("[llm-handler] Missing GOOGLE_API_KEY");
      return new Response(JSON.stringify({ error: "LLM service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acceptHeader = req.headers.get("accept") || "";
    const wantsStream = acceptHeader.includes("text/event-stream");

    const startTime = Date.now();
    let accumulatedText = "";

    const makeGeminiRequest = async () => {
      const contents = (history || []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(`Gemini error: ${resp.status} ${t}`);
      }
      return resp.body.getReader();
    };

    if (wantsStream) {
      const stream = new ReadableStream({
        start(controller) {
          (async () => {
            try {
              const reader = await makeGeminiRequest();
              const decoder = new TextDecoder();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((l) => l.trim());
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (text) {
                        accumulatedText += text;
                        controller.enqueue(`data: ${JSON.stringify({ delta: text })}\n\n`);
                      }
                    } catch (e) {
                      // ignore parse errors for keep-alive
                    }
                  }
                }
              }

              const latency_ms = Date.now() - startTime;
              const { error: finalizeError } = await supabase
                .from("messages")
                .update({ text: accumulatedText, status: "complete", latency_ms })
                .eq("id", assistantMessage.id);
              if (finalizeError) {
                console.error("[llm-handler] Finalize error:", finalizeError);
              }

              controller.enqueue(
                `data: ${JSON.stringify({ done: true, assistant_message_id: assistantMessage.id, latency_ms })}\n\n`
              );
              controller.close();
            } catch (e) {
              console.error("[llm-handler] Stream error:", e);
              controller.enqueue(`data: ${JSON.stringify({ error: String(e?.message ?? e) })}\n\n`);
              controller.close();
              // Mark message as failed
              await supabase
                .from("messages")
                .update({ status: "failed", error: { message: String(e?.message ?? e) } })
                .eq("id", assistantMessage.id);
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming: aggregate, then respond
    try {
      const reader = await makeGeminiRequest();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) accumulatedText += text;
            } catch {}
          }
        }
      }
      const latency_ms = Date.now() - startTime;
      const { error: finalizeError } = await supabase
        .from("messages")
        .update({ text: accumulatedText, status: "complete", latency_ms })
        .eq("id", assistantMessage.id);
      if (finalizeError) console.error("[llm-handler] Finalize error:", finalizeError);

      return new Response(
        JSON.stringify({ text: accumulatedText, assistant_message_id: assistantMessage.id, latency_ms }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      console.error("[llm-handler] Non-stream error:", e);
      await supabase
        .from("messages")
        .update({ status: "failed", error: { message: String(e?.message ?? e) } })
        .eq("id", assistantMessage.id);
      return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("[llm-handler] Handler error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

 
