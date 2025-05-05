
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ──────────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// 1 MB payload guard (tweak if you expect larger bodies)
const MAX_BODY = 1_048_576;

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
): Response =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

// Grabs API key from header → query → JSON body (in that order)
const getApiKey = async (req: Request): Promise<string | null> => {
  console.log("Starting API key extraction from request headers");
  // A. Authorization: Bearer …………………………
  const authHeader = req.headers.get("authorization");
  console.log(`Authorization header: ${authHeader ? "Found" : "Missing"}`);
  if (authHeader) {
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
    return authHeader; // raw key
  }

  // B. ?api_key=…………………………
  const url = new URL(req.url);
  const keyInQuery = url.searchParams.get("api_key");
  if (keyInQuery) {
    console.log("API key found in query parameters");
    return keyInQuery;
  }

  // C. { "api_key": "…………………………" } in JSON body
  if (
    req.method === "POST" &&
    req.headers.get("content-type")?.includes("application/json")
  ) {
    // Guard big bodies
    const reader = req.body?.getReader();
    if (!reader) return null;

    let bytesRead = 0;
    const chunks: Uint8Array[] = [];
    for (; ;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      if (bytesRead > MAX_BODY) throw new Error("Body too large");
      chunks.push(value);
    }
    const text = new TextDecoder().decode(
      chunks.length === 1 ? chunks[0] : concat(...chunks),
    );
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.api_key === "string") {
        console.log("API key found in request body");
        return parsed.api_key;
      }
    } catch (_) {
      /* fallthrough – will be handled later */
    }
  }
  console.log("No API key provided in request");
  return null;
};

const concat = (...chunks: Uint8Array[]): Uint8Array => {
  const len = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
};

const createSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("[fatal] missing Supabase env vars");
    throw new Error("Missing Supabase credentials");
  }
  return createClient(url, serviceKey);
};

// ──────────────────────────────────────────────────────────────────────────
// Validation & usage
// ──────────────────────────────────────────────────────────────────────────
const validateApiKey = async (key: string) => {
  console.log(`Validating API key: ${key.substring(0, 5)}...`);
  const supabase = createSupabase();
  
  // Now we directly query the api_keys table without using digest function
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", key)
    .maybeSingle();
  
  if (error) {
    console.error(`[error] API key validation failed: ${error.message}`);
    throw new Error(error.message);
  }
  
  console.log(`API key validation result: ${data ? (data.is_active ? "active" : "inactive") : "not found"}`);
  return data && data.is_active ? data.user_id as string : null;
};

const recordUsage = async (userId: string) => {
  console.log(`Recording API usage for user: ${userId}`);
  const supabase = createSupabase();
  const { error } = await supabase
    .from("api_usage")
    .insert({ user_id: userId });
  if (error) console.warn("[warn] usage insert failed:", error.message);
};

// ──────────────────────────────────────────────────────────────────────────
// Main entry
// ──────────────────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  const { method, url } = req;
  const debug = `[${new Date().toISOString()}]`;
  console.log(`API function invoked: ${new Date().toISOString()}`);
  console.log(`Request URL: ${url}`);
  console.log(`Request method: ${method}`);

  // OPTIONS pre-flight
  if (method === "OPTIONS") return jsonResponse({}, 204);

  // Only allow GET/POST
  if (method !== "GET" && method !== "POST") {
    console.info(`${debug} 405 ${method} ${url}`);
    return jsonResponse(
      { success: false, message: "Method not allowed" },
      405,
    );
  }

  try {
    const apiKey = await getApiKey(req);

    if (!apiKey) {
      console.info(`${debug} 401 missing-key ${url}`);
      return jsonResponse(
        {
          success: false,
          message:
            "API key required. Supply it in the Authorization header, ?api_key query, or JSON body.",
        },
        401,
      );
    }

    const userId = await validateApiKey(apiKey);
    if (!userId) {
      console.info(`${debug} 401 bad-key ${url}`);
      return jsonResponse(
        { success: false, message: "Invalid or inactive API key." },
        401,
      );
    }

    // TODO: rate-limit / quota check here

    await recordUsage(userId);

    // TODO: route to real business logic if you have multiple endpoints
    console.info(`${debug} 200 ok user=${userId} ${url}`);
    return jsonResponse({
      success: true,
      message: "API authentication succeeded.",
      timestamp: new Date().toISOString(),
      user_id: userId,
      endpoint: new URL(url).pathname,
      method,
    });
  } catch (err: any) {
    console.error(`${debug} 500`, err);
    return jsonResponse(
      {
        success: false,
        message: "Internal error while processing request.",
        error: err?.message ?? "unknown",
      },
      500,
    );
  }
});
