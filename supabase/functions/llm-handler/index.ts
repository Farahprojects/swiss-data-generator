// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// We'll create the Supabase client per-request with forwarded auth

// No inline context injection here. Context should be pre-seeded as a message
// with meta.type = 'context_injection' or 'context_preseeded'.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Per-request Supabase client with forwarded auth
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body = await req.json().catch(() => ({}));
    const conversationId = body?.conversationId as string | undefined;
    const userMessage = body?.userMessage as { text?: string; meta?: Record<string, unknown> } | undefined;

    if (!conversationId || !userMessage?.text) {
      return new Response(JSON.stringify({ error: "Missing 'conversationId' or 'userMessage.text'" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const messageInsertData = {
      conversation_id: conversationId,
      role: 'user',
      text: userMessage.text,
      meta: userMessage.meta ?? {},
    };

    // Fire-and-forget insert – do not await
    EdgeRuntime?.waitUntil?.(
      supabase
        .from('messages')
        .insert(messageInsertData)
        .then(
          () => console.log('[llm-handler] User message insert completed.'),
          (err) => console.error('[llm-handler] User message insert failed:', err)
        )
    );

    // Respond immediately – save-only mode
    return new Response(JSON.stringify({ ok: true, queued: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[llm-handler] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
