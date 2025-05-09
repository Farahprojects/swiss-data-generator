import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";
import { checkApiKeyAndBalance } from "../_shared/balanceChecker.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const sb = createClient(SB_URL, SB_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "x-api-key, apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

function extractApiKey(
  headers: Headers,
  url: URL,
  body?: Record<string, unknown>,
): string | null {
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
    if (raw.byteLength) bodyJson = JSON.parse(new TextDecoder().decode(raw));
  }

  const apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  if (!apiKey) {
    return json({
      success: false,
      message:
        "API key missing. Pass it in the 'x-api-key', 'apikey', 'Authorization' header, ?api_key query param, or api_key JSON field.",
    }, 401);
  }

  // 🔍 Injected debug log before calling balance checker
  await sb.from("debug_logs").insert([{
    source: "swiss",
    message: "About to check API key and balance",
    data: { apiKey }
  }]);

  const check = await checkApiKeyAndBalance(apiKey);

  if (!check.isValid) {
    return json({ success: false, message: check.errorMessage }, 401);
  }

  if (!check.hasBalance) {
    return json({ success: false, message: check.errorMessage }, 402);
  }

  urlObj.searchParams.delete("api_key");
  const mergedPayload = {
    ...(bodyJson ?? {}),
    ...Object.fromEntries(urlObj.searchParams.entries()),
    user_id: check.userId,
    api_key: apiKey,
  };

  const { status, text } = await translate(mergedPayload);
  return new Response(text, { status, headers: corsHeaders });
});
