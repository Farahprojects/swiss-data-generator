
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

// Enhanced log helper with session tracking
async function logDebug(sessionId: string, source: string, message: string, data: any = null, level: string = 'info', sequence: number = 0) {
  try {
    await sb.from("debug_logs").insert([{ 
      source, 
      message, 
      data, 
      session_id: sessionId,
      log_level: level,
      sequence_number: sequence
    }]);
  } catch (err) {
    console.error("[debug_logs] Insert failed:", err);
  }
}

// Helper to generate a session ID
async function generateSessionId() {
  try {
    const { data } = await sb.rpc('generate_session_id');
    return data || crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  } catch (err) {
    // Fallback if RPC fails
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }
}

function extractApiKey(headers: Headers, url: URL, body?: Record<string, unknown>): string | null {
  const auth = headers.get("authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : auth;
    if (token && token.length > 16) return token;
  }

  const h1 = headers.get("x-api-key") || headers.get("apikey");
  if (h1 && h1.length > 16) return h1;

  const qp = url.searchParams.get("api_key");
  if (qp && qp.length > 16) return qp;

  if (body?.api_key && String(body.api_key).length > 16) return String(body.api_key);

  return null;
}

serve(async (req) => {
  const urlObj = new URL(req.url);
  const sessionId = await generateSessionId();
  let sequenceNum = 0;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!["GET", "POST"].includes(req.method)) {
    await logDebug(sessionId, "swiss", "Method not allowed", { method: req.method }, "error", sequenceNum++);
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  let bodyJson: Record<string, unknown> | undefined;
  if (req.method === "POST") {
    const raw = await req.arrayBuffer();
    if (raw.byteLength) {
      bodyJson = JSON.parse(new TextDecoder().decode(raw));
    }
  }

  const apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  if (!apiKey) {
    await logDebug(sessionId, "swiss", "Missing API key", { headers: Object.fromEntries(req.headers) }, "error", sequenceNum++);
    return json({ success: false, message: "Missing API key." }, 401);
  }

  await logDebug(sessionId, "swiss", "Extracted API key", { apiKey }, "info", sequenceNum++);

  const { data: row, error } = await sb
    .from("v_api_key_balance")
    .select("user_id, balance_usd")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) {
    await logDebug(sessionId, "swiss", "Balance lookup error", { apiKey, error }, "error", sequenceNum++);
    return json({ success: false, message: "Balance lookup failed." }, 500);
  }

  if (!row) {
    await logDebug(sessionId, "swiss", "API key not found in v_api_key_balance", { apiKey }, "error", sequenceNum++);
    return json({
      success: false,
      message: "Invalid API key. Log in at theraiapi.com to check your credentials.",
    }, 401);
  }

  const balance = parseFloat(String(row.balance_usd));
  await logDebug(sessionId, "swiss", "Balance fetched", { user_id: row.user_id, balance }, "info", sequenceNum++);

  if (!Number.isFinite(balance) || balance <= 0) {
    await logDebug(sessionId, "swiss", "Insufficient balance", { user_id: row.user_id, balance }, "warning", sequenceNum++);
    return json({
      success: false,
      message: `Your account is active, but your balance is $${balance}. Please top up to continue.`,
    }, 402);
  }

  urlObj.searchParams.delete("api_key");
  const mergedPayload = {
    ...(bodyJson ?? {}),
    ...Object.fromEntries(urlObj.searchParams.entries()),
    user_id: row.user_id,
    api_key: apiKey,
  };

  await logDebug(sessionId, "swiss", "Sending payload to translator", { user_id: row.user_id }, "info", sequenceNum++);

  const { status, text } = await translate(mergedPayload);
  await logDebug(sessionId, "swiss", "Received response from translator", { status }, "info", sequenceNum++);
  
  return new Response(text, { status, headers: corsHeaders });
});
