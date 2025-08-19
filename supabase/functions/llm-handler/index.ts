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
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      console.error("[llm-handler] Missing GOOGLE_API_KEY");
      return new Response(JSON.stringify({ error: "LLM service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Gemini API (non-streaming)
    console.log("[llm-handler] Calling Gemini API");
    const startTime = Date.now();
    
    const contents = (history || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { 
            maxOutputTokens: 2048, 
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
        meta: { 
          llm_provider: "google", 
          model: "gemini-2.5-flash",
          latency_ms 
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