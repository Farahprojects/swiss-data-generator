// supabase/functions/swiss/index.ts  (formerly auth gateway)
// Single edge‑function that:
//   1. Validates API key
//   2. Records usage
//   3. Calls the in‑process translator helper (`_shared/translator.ts`)
// No HTTP hop – all logic runs in one function.

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";  // relative to /functions/swiss/

/*─────────────────────────── ENV */
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SB_URL || !SB_KEY) throw new Error("Supabase env vars missing");
const sb = createClient(SB_URL, SB_KEY);

/*─────────────────────────── CONFIG */
const MAX_BODY = 1_048_576; // 1 MB
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

/*─────────────────────────── Helpers */
async function readBody(req: Request): Promise<Uint8Array> {
  const ab = await req.arrayBuffer();
  if (ab.byteLength > MAX_BODY) throw new Error("Body too large");
  return new Uint8Array(ab);
}

function extractApiKey(headers: Headers, url: URL, body?: Record<string, unknown>): string | null {
  // Authorization header
  const auth = headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : auth;
  }
  // query param
  const qp = url.searchParams.get("api_key");
  if (qp) return qp;
  // JSON body field
  if (body && typeof body.api_key === "string") return body.api_key;
  return null;
}

async function validateKey(k: string) {
  const { data, error } = await sb.from("api_keys").select("user_id,is_active").eq("api_key", k).maybeSingle();
  if (error) throw new Error(error.message);
  return data && data.is_active ? (data.user_id as string) : null;
}

async function recordUsage(uid: string) {
  await sb.from("api_usage").insert({ user_id: uid });
}

/*─────────────────────────── Handler */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return json({ success: false, message: "Method not allowed" }, 405);

  const bodyBytes = req.method === "POST" ? await readBody(req) : undefined;
  let bodyJson: Record<string, unknown> | undefined;
  if (bodyBytes && bodyBytes.length) {
    try { bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes)); }
    catch { return json({ success: false, message: "Invalid JSON body" }, 400); }
  }

  const urlObj = new URL(req.url);
  const apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  if (!apiKey) return json({ success: false, message: "API key required" }, 401);

  const userId = await validateKey(apiKey);
  if (!userId) return json({ success: false, message: "Invalid or inactive API key" }, 401);
  recordUsage(userId).catch(() => {});

  // Merge query params (+ remove api_key) with bodyJson to build translator payload
  urlObj.searchParams.delete("api_key");
  const queryObj = Object.fromEntries(urlObj.searchParams.entries());
  const mergedPayload = { ...(bodyJson ?? {}), ...queryObj };

  try {
    const { status, text } = await translate(mergedPayload);
    return new Response(text, { status, headers: corsHeaders });
  } catch (err) {
    return json({ success: false, message: (err as Error).message }, 500);
  }
});
