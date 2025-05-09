// functions/swiss/index.ts

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";
import { checkApiKeyAndBalance } from "../_shared/balanceChecker.ts";

/*──────────────────── ENV */
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SB_URL, SB_KEY);

/*──────────────────── Misc */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "x-api-key, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

/*──────────────────── Helper: extract API key */
function extractApiKey(
  headers: Headers,
  url: URL,
  body?: Record<string, unknown>,
): string | null {
  // 1 Custom headers
  const h1 = headers.get("x-api-key") || headers.get("apikey");
  if (h1) return h1;

  // 2 Query param
  const qp = url.searchParams.get("api_key");
  if (qp) return qp;

  // 3 JSON body
  if (body && typeof body.api_key === "string") return body.api_key;

  return null;
}

/*──────────────────── Handler */
serve(async (req) => {
  const urlObj = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!["GET", "POST"].includes(req.method)) {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  /*──── Parse body (POST only) */
  let bodyJson: Record<string, unknown> | undefined;
  if (req.method === "POST") {
    const raw = await req.arrayBuffer();
    if (raw.byteLength) bodyJson = JSON.parse(new TextDecoder().decode(raw));
  }

  /*──── API-key extraction */
  const apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  if (!apiKey) {
    return json(
      {
        success: false,
        message:
          "API key missing. Pass it in the 'x-api-key' header, the 'apikey' header, the ?api_key query param, or the api_key JSON field.",
      },
      401,
    );
  }

  /*──── Validate and charge credits */
  const check = await checkApiKeyAndBalance(apiKey);
  if (!check.isValid || !check.hasBalance) {
    return json({ success: false, message: check.errorMessage }, 402);
  }

  /*──── Prepare payload for translator */
  urlObj.searchParams.delete("api_key"); // don’t forward
  const mergedPayload = {
    ...(bodyJson ?? {}),
    ...Object.fromEntries(urlObj.searchParams.entries()),
    user_id: check.userId,
    api_key: apiKey,
  };

  /*──── Call translator → Gemini */
  const { status, text } = await translate(mergedPayload);
  return new Response(text, { status, headers: corsHeaders });
});
