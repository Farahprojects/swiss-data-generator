import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { guest_report_id } = await req.json();
    const requestId = Math.random().toString(36).slice(2);
    console.log(`[inject-report-context][${requestId}] start`, { guest_report_id });

    if (!guest_report_id || typeof guest_report_id !== "string") {
      return new Response(JSON.stringify({ error: "guest_report_id required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Ensure a ready signal exists to avoid premature injections
    const { data: readySignal, error: readyErr } = await supabase
      .from('report_ready_signals')
      .select('guest_report_id')
      .eq('guest_report_id', guest_report_id)
      .single();

    if (readyErr || !readySignal) {
      console.log(`[inject-report-context][${requestId}] no ready signal yet`);
      return new Response(JSON.stringify({ status: 'not_ready' }), { status: 202, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Get or create conversation for this guest
    let conversationId: string | null = null;
    const { data: existingConv, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('guest_id', guest_report_id)
      .limit(1)
      .maybeSingle();

    if (convErr) throw convErr;
    if (existingConv?.id) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: newConvErr } = await supabase
        .from('conversations')
        .insert({ guest_id: guest_report_id })
        .select('id')
        .single();
      if (newConvErr) throw newConvErr;
      conversationId = newConv.id;
    }

    // Guard: if context already injected, exit safely
    const { data: existingContext, error: contextErr } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .contains('meta', { type: 'context_injection' })
      .limit(1);
    if (contextErr) throw contextErr;
    if (existingContext && existingContext.length > 0) {
      console.log(`[inject-report-context][${requestId}] already injected`);
      return new Response(JSON.stringify({ status: 'already_injected', conversationId }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Fetch report payload using get-report-data
    const { data: reportFetch, error: reportFetchErr } = await supabase.functions.invoke('get-report-data', {
      body: { guest_report_id }
    });
    if (reportFetchErr) {
      console.warn(`[inject-report-context][${requestId}] get-report-data failed`, reportFetchErr);
      return new Response(JSON.stringify({ error: 'get-report-data failed' }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (!reportFetch?.ready || !reportFetch?.data) {
      console.log(`[inject-report-context][${requestId}] report not ready`);
      return new Response(JSON.stringify({ status: 'not_ready' }), { status: 202, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const payload = reportFetch.data;
    const parts: string[] = [];
    if (payload.report_content) {
      parts.push(`Here is my astrological report:\n\n${payload.report_content}\n\n`);
    }
    if (payload.swiss_data) {
      parts.push(`Here is my birth chart data:\n\n${JSON.stringify(payload.swiss_data, null, 2)}\n\n`);
    }
    if (payload.metadata) {
      parts.push(`Additional details: ${JSON.stringify(payload.metadata, null, 2)}\n\n`);
    }
    const composedText = (parts.join('') + `Please analyze this astrological information and help me understand what it means.`).trim();

    // Use llm-handler to store user message and generate assistant response
    const userMessage = {
      text: composedText,
      meta: {
        type: 'context_injection',
        injected_at: new Date().toISOString(),
        has_report: !!payload.report_content,
        has_swiss_data: !!payload.swiss_data,
        has_metadata: !!payload.metadata,
      },
    };

    const { data: llmResult, error: llmErr } = await supabase.functions.invoke('llm-handler', {
      body: { conversationId, userMessage }
    });
    if (llmErr) {
      console.warn(`[inject-report-context][${requestId}] llm-handler failed`, llmErr);
      // As fallback, at least insert the user message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        text: composedText,
        meta: userMessage.meta,
      });
    }

    return new Response(JSON.stringify({ status: 'injected', conversationId }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('[inject-report-context] error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});


