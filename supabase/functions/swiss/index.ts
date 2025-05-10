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

// Log helper
async function logDebug(source: string, message: string, data: any = null) {
  try {
    await sb.from("debug_logs").insert([{ source, message, data }]);
  } catch (err) {
    console.error("[debug_logs] Insert failed:", err);
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

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!["GET", "POST"].includes(req.method)) {
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
    await logDebug("swiss", "Missing API key", { headers: req.headers });
    return json({ success: false, message: "Missing API key." }, 401);
  }

  await logDebug("swiss", "Extracted API key", { apiKey });

  const { data: row, error } = await sb
    .from("v_api_key_balance")
    .select("user_id, balance_usd")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) {
    await logDebug("swiss", "Balance lookup error", { apiKey, error });
    return json({ success: false, message: "Balance lookup failed." }, 500);
  }

  if (!row) {
    await logDebug("swiss", "API key not found in v_api_key_balance", { apiKey });
    return json({
      success: false,
      message: "Invalid API key. Log in at theraiapi.com to check your credentials.",
    }, 401);
  }

  const balance = parseFloat(String(row.balance_usd));
  await logDebug("swiss", "Balance fetched", { user_id: row.user_id, balance });

  if (!Number.isFinite(balance) || balance <= 0) {
    await logDebug("swiss", "Insufficient balance", { user_id: row.user_id, balance });
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

  await logDebug("swiss", "Sending payload to translator", { user_id: row.user_id });

  const { status, text } = await translate(mergedPayload);
  return new Response(text, { status, headers: corsHeaders });
});
