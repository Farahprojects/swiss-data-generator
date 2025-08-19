import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definition for a standard Edge Function handler
type EdgeFunctionHandler = (request: Request) => Promise<Response>;

// --- CONFIGURATION (can be fetched from rate_limit_rules table later) ---
const RATE_LIMIT_HITS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const BLOCK_DURATION_SECONDS = 300;

// --- INITIALIZE CLIENTS (for performance) ---
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const kv = await Deno.openKv();


/**
 * A security middleware that wraps an Edge Function handler.
 * It provides rate-limiting, allow-listing, token validation, and logging.
 * @param handler The original Edge Function logic.
 * @param functionName A unique name for the function being protected.
 * @returns A new, protected Edge Function handler.
 */
export function withSecurity(handler: EdgeFunctionHandler, functionName: string): EdgeFunctionHandler {
  return async (request: Request): Promise<Response> => {
    const ip = request.headers.get("x-forwarded-for")?.split(',')[0].trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const requestId = crypto.randomUUID();

    // --- 1. IP Allowlist Check ---
    const { data: allowedIp } = await kv.get(["ip_allowlist", ip]);
    if (allowedIp) {
      console.log(`[${functionName}] ✅ IP ${ip} on allowlist. Bypassing checks.`);
      return handler(request);
    }

    // --- 2. Rate Limiting with Deno KV ---
    const hitKey = ["rate_limit", ip, functionName];
    const blockKey = ["rate_limit_block", ip];

    const { data: blockedUntil } = await kv.get<number>(blockKey);
    if (blockedUntil && Date.now() < blockedUntil) {
      logRequest({ status_code: 429, is_blocked: true });
      return new Response("You are temporarily blocked.", { status: 429 });
    }

    const { value } = await kv.get<Deno.KvU64>(hitKey);
    const newCount = (value?.value ?? 0n) + 1n;

    if (newCount > RATE_LIMIT_HITS) {
      await kv.set(blockKey, Date.now() + BLOCK_DURATION_SECONDS * 1000, { expireIn: BLOCK_DURATION_SECONDS * 1000 });
      logRequest({ status_code: 429, is_blocked: true });
      return new Response("Rate limit exceeded.", { status: 429 });
    }
    await kv.set(hitKey, new Deno.KvU64(newCount), { expireIn: RATE_LIMIT_WINDOW_SECONDS * 1000 });

    // --- 3. Token Validation Logic ---
    let tokenHash: string | undefined;
    if (functionName === 'fetch-temp-report') {
      const token = request.headers.get("X-Report-Token");
      if (!token) {
        logRequest({ status_code: 401 });
        return new Response("Token required.", { status: 401 });
      }
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
      tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { data: validToken, error } = await supabaseAdmin
        .from('temp_report_data')
        .select('id')
        .eq('token_hash', tokenHash) // Assumes you have a 'token_hash' column
        .maybeSingle();

      if (error || !validToken) {
        logRequest({ status_code: 403, token_hash: tokenHash });
        return new Response("Invalid or expired token.", { status: 403 });
      }
    }
    
    // --- 4. Execute Original Handler ---
    const response = await handler(request);
    
    // --- 5. Log Request Asynchronously ---
    logRequest({ status_code: response.status, token_hash: tokenHash });
    
    return response;

    // --- Internal Logging Helper ---
    async function logRequest(details: { status_code: number; is_blocked?: boolean; token_hash?: string }) {
      // This is a "fire and forget" operation
      supabaseAdmin.from('edge_function_logs').insert({
        function_name: functionName,
        ip_address: ip,
        request_id: requestId,
        user_agent: userAgent,
        ...details,
      }).then();
    }
  };
}