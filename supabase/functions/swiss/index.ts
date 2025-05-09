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
import { checkApiKeyAndBalance } from "../_shared/balanceChecker.ts";

/*─────────────────────────── ENV */
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SB_URL || !SB_KEY) {
    console.error("[swiss] ❌ Supabase env vars missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
    throw new Error("Supabase env vars missing");
}

// Add JWT format validation check
if (!SB_KEY.startsWith("eyJ")) {
    console.error("[swiss] 🚨 JWT ERROR 🚨: SUPABASE_SERVICE_ROLE_KEY does not appear to be in correct JWT format");
}

let sb;
try {
    console.log("[swiss] Initializing Supabase client...");
    sb = createClient(SB_URL, SB_KEY);
    console.info("[swiss] Supabase client created successfully");
} catch (err) {
    console.error(`[swiss] 🚨 JWT ERROR 🚨: Failed to initialize Supabase client: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
}

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

// This function is no longer needed as we're using the balanceChecker instead
// async function validateKey(k: string): Promise<string | null> {
//   // ... keep existing code (old validation function)
// }

/*─────────────────────────── Handler */
serve(async (req) => {
  const urlObj = new URL(req.url);
  console.info(`[swiss] [${req.method}] Received request for: ${urlObj.pathname}${urlObj.search}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.info("[swiss] Handling OPTIONS request (CORS preflight).");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Check allowed methods
  if (!["GET", "POST"].includes(req.method)) {
    console.warn(`[swiss] Method not allowed: ${req.method}`);
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  let bodyJson: Record<string, unknown> | undefined;
  // Read and parse body for POST requests
  if (req.method === "POST") {
      try {
          const bodyBytes = await readBody(req);
          if (bodyBytes && bodyBytes.length > 0) {
              console.info("[swiss] Attempting to parse JSON body...");
              bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes));
              console.info("[swiss] JSON body successfully parsed.");
          } else {
              console.info("[swiss] Request body is empty.");
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
    return json({ 
      success: false, 
      message: "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key." 
    }, 401);
  }

  // Use the new balance checker utility
  console.info("[swiss] Validating API key and checking balance...");
  try {
    const validationResult = await checkApiKeyAndBalance(apiKey);
    
    if (!validationResult.isValid) {
      console.warn("[swiss] API key validation failed");
      return json({ success: false, message: validationResult.errorMessage }, 401);
    }
    
    if (!validationResult.hasBalance) {
      console.warn(`[swiss] User ${validationResult.userId} has insufficient balance`);
      return json({ success: false, message: validationResult.errorMessage }, 402); // 402 Payment Required
    }
    
    // API key and balance check passed, proceed with API call
    const userId = validationResult.userId;
    console.info(`[swiss] API key and balance validation passed for user: ${userId}`);

    // Prepare payload for translator
    console.info("[swiss] Preparing payload for translator...");
    urlObj.searchParams.delete("api_key"); // Ensure key isn't passed downstream
    const queryObj = Object.fromEntries(urlObj.searchParams.entries());
    const mergedPayload = { 
      ...(bodyJson ?? {}), 
      ...queryObj,
      user_id: userId, // Add the user ID to the payload
      api_key: apiKey  // Pass the API key for the report orchestrator
    };
    console.info("[swiss] Translator payload prepared.");

    // Extract endpoint from the path for usage recording
    const pathParts = urlObj.pathname.split('/');
    const endpoint = pathParts[pathParts.length - 1] || 'swiss'; // Use the last path segment or 'swiss' if empty
    
    // Call the translator
    try {
      console.info("[swiss] Calling the translator helper function...");
      const { status, text } = await translate(mergedPayload);
      console.info(`[swiss] Translator helper returned status: ${status}`);
      // Note: Intentionally using Response directly for potential non-JSON translator outputs
      // Ensure CORS headers are still applied for successful translation responses
      const responseHeaders = new Headers(corsHeaders);
      // Preserve Content-Type if translator sets it, otherwise default to JSON
      if (!responseHeaders.has('Content-Type')) {
          responseHeaders.set('Content-Type', 'application/json');
      }
      return new Response(text, { status, headers: responseHeaders });
    } catch (err) {
      if (String(err).includes("JWT") || String(err).includes("401")) {
        console.error(`[swiss] 🚨 JWT ERROR 🚨 calling translator helper: ${err instanceof Error ? err.message : String(err)}`);
      } else {
        console.error("[swiss] Error calling translator helper:", (err as Error).message, err);
      }
      return json({ success: false, message: `Translation failed: ${(err as Error).message}` }, 500);
    }
  } catch (balanceError) {
    // Special handling for JWT errors in the balance checker
    if (String(balanceError).includes("JWT") || String(balanceError).includes("401")) {
      console.error(`[swiss] 🚨 JWT ERROR 🚨 in balance checker: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`);
      return json({ success: false, message: "Authentication error during API key validation. Please try again." }, 500);
    } else {
      console.error("[swiss] Balance checker error:", balanceError);
      return json({ success: false, message: "Error validating API key. Please try again." }, 500);
    }
  }
});

console.info("[swiss] Swiss function handler registered.");
