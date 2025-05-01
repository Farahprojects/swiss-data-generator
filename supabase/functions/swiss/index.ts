// supabase/functions/swiss/index.ts
// Single edge‑function that:
//   1. Validates API key
//   2. Records usage
//   3. Calls the in‑process translator helper (`_shared/translator.ts`)
// No HTTP hop – all logic runs in one function.
// Includes added logging for request lifecycle monitoring.

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";  // relative to /functions/swiss/

/*─────────────────────────── ENV */
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SB_URL || !SB_KEY) {
    console.error("Supabase env vars missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
    throw new Error("Supabase env vars missing");
}
const sb = createClient(SB_URL, SB_KEY);
console.info("Swiss function initialized. Supabase client created.");

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
  if (ab.byteLength > MAX_BODY) {
    console.warn(`Request body exceeded max size: ${ab.byteLength} bytes`);
    throw new Error("Body too large");
  }
  console.info(`Read request body: ${ab.byteLength} bytes`);
  return new Uint8Array(ab);
}

function extractApiKey(headers: Headers, url: URL, body?: Record<string, unknown>): string | null {
  // Authorization header
  const auth = headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const key = m ? m[1] : auth;
    if (key) {
        console.info("API key found in Authorization header.");
        return key;
    }
  }
  // query param
  const qp = url.searchParams.get("api_key");
  if (qp) {
      console.info("API key found in query parameters.");
      return qp;
  }
  // JSON body field
  if (body && typeof body.api_key === "string") {
      console.info("API key found in JSON body.");
      return body.api_key;
  }
  console.warn("API key not found in request.");
  return null;
}

async function validateKey(k: string): Promise<string | null> {
  console.info("Attempting to validate API key...");
  const { data, error } = await sb.from("api_keys").select("user_id,is_active").eq("api_key", k).maybeSingle();
  if (error) {
      console.error("Error validating API key:", error.message);
      throw new Error(error.message); // Propagate DB errors
  }
  const isValid = data && data.is_active;
  if (isValid) {
      console.info(`API key successfully validated for user: ${data.user_id}`);
      return data.user_id as string;
  } else {
      console.warn(`API key validation failed. Key found: ${!!data}, Active: ${data?.is_active}`);
      return null;
  }
}

async function recordUsage(uid: string) {
    console.info(`Attempting to record usage for user: ${uid}`);
    const { error } = await sb.from("api_usage").insert({ user_id: uid });
    if (error) {
        // Log error but don't fail the request for usage recording issues
        console.error(`Failed to record usage for user ${uid}:`, error.message);
    } else {
        console.info(`Usage successfully recorded for user: ${uid}`);
    }
}

/*─────────────────────────── Handler */
serve(async (req) => {
  const urlObj = new URL(req.url);
  console.info(`[${req.method}] Received request for: ${urlObj.pathname}${urlObj.search}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.info("Handling OPTIONS request (CORS preflight).");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Check allowed methods
  if (!["GET", "POST"].includes(req.method)) {
    console.warn(`Method not allowed: ${req.method}`);
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  let bodyJson: Record<string, unknown> | undefined;
  // Read and parse body for POST requests
  if (req.method === "POST") {
      try {
          const bodyBytes = await readBody(req);
          if (bodyBytes && bodyBytes.length > 0) {
              console.info("Attempting to parse JSON body...");
              bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes));
              console.info("JSON body successfully parsed.");
          } else {
              console.info("Request body is empty.");
          }
      } catch (err) {
          if (err instanceof SyntaxError) {
              console.warn("Invalid JSON body received.");
              return json({ success: false, message: "Invalid JSON body" }, 400);
          }
          console.error("Error reading request body:", (err as Error).message);
          return json({ success: false, message: (err as Error).message }, 400); // e.g., Body too large
      }
  }

  // Extract API Key
  const apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  if (!apiKey) {
    // Warning already logged in extractApiKey
    return json({ success: false, message: "API key required" }, 401);
  }

  // Validate API Key
  let userId: string | null = null;
  try {
      userId = await validateKey(apiKey);
  } catch (dbError) {
      // Error already logged in validateKey
      return json({ success: false, message: "Error during API key validation" }, 500);
  }

  if (!userId) {
      // Warning already logged in validateKey
      return json({ success: false, message: "Invalid or inactive API key" }, 401);
  }
  // API Key is valid, proceed.

  // Record Usage (async, don't block response)
  recordUsage(userId); // Fire and forget, logging handled inside

  // Prepare payload for translator
  console.info("Preparing payload for translator...");
  urlObj.searchParams.delete("api_key"); // Ensure key isn't passed downstream
  const queryObj = Object.fromEntries(urlObj.searchParams.entries());
  const mergedPayload = { ...(bodyJson ?? {}), ...queryObj };
  console.info("Translator payload prepared.");

  // Call the translator
  try {
    console.info("Calling the translator helper function...");
    const { status, text } = await translate(mergedPayload);
    console.info(`Translator helper returned status: ${status}`);
    // Note: Intentionally using Response directly for potential non-JSON translator outputs
    // Ensure CORS headers are still applied for successful translation responses
    const responseHeaders = new Headers(corsHeaders);
    // Preserve Content-Type if translator sets it, otherwise default to JSON
    if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'application/json');
    }
    return new Response(text, { status, headers: responseHeaders });
  } catch (err) {
    console.error("Error calling translator helper:", (err as Error).message, err);
    return json({ success: false, message: `Translation failed: ${(err as Error).message}` }, 500);
  }
});

console.info("Swiss function handler registered.");
