import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translate } from "../_shared/translator.ts";

// Initialize Supabase client
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

// Log helper function that writes to swissdebuglogs table (lowercase)
async function logSwissDebug(request: any, responseStatus: number, responseText: string) {
  try {
    // Skip logging if this is a report request - standard-report will handle that
    if (request.requestType === "reports" || (request.payload?.report && ["standard", "premium"].includes(request.payload.report))) {
      console.log("[swiss] Skipping debug log for report request, will be logged by report service");
      return;
    }
    
    const logData = {
      api_key: request.apiKey,
      user_id: request.userId,
      balance_usd: request.balance,
      request_type: request.requestType,
      request_payload: request.payload,
      response_status: responseStatus,
      response_text: responseText
    };
    
    // Insert log data into swissdebuglogs table (lowercase)
    await sb.from("swissdebuglogs").insert([logData]);
  } catch (err) {
    console.error("[swissdebuglogs] Failed to write log:", err);
  }
}

// Function to extract API key from request
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

// Updated function to retrieve API key by email using Admin API
async function getApiKeyByEmail(email: string): Promise<string | null> {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.log("[swiss] Invalid email format:", email);
    return null;
  }

  try {
    console.log("[swiss] Looking up API key for email:", email);
    
    // Use the Admin API to look up the user by email
    const { data: userData, error: userError } = await sb.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
      
    if (userError || !userData || userData.users.length === 0) {
      console.log("[swiss] Failed to find user with email:", email, userError);
      return null;
    }
    
    const userId = userData.users[0].id;
    
    // Then, get the API key associated with this user_id
    const { data: keyData, error: keyError } = await sb
      .from("api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
      
    if (keyError || !keyData) {
      console.log("[swiss] Failed to find API key for user:", userId, keyError);
      return null;
    }
    
    console.log("[swiss] Successfully found API key for email:", email);
    return keyData.api_key;
  } catch (err) {
    console.error("[swiss] Error looking up API key by email:", err);
    return null;
  }
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

  // Try to extract API key using standard methods
  let apiKey = extractApiKey(req.headers, urlObj, bodyJson);
  let authMethod = "api_key";
  
  // If no API key found but email is provided, try to look up API key by email
  if (!apiKey && bodyJson?.email) {
    console.log("[swiss] No API key found, trying email lookup with:", bodyJson.email);
    apiKey = await getApiKeyByEmail(String(bodyJson.email));
    if (apiKey) {
      console.log("[swiss] Successfully authenticated via email");
      authMethod = "email";
    }
  }

  // If still no API key, return unauthorized
  if (!apiKey) {
    return json({ 
      success: false, 
      message: "Authentication required. Please provide an API key or valid email." 
    }, 401);
  }

  // Proceed with balance check using the API key (regardless of how it was obtained)
  const { data: row, error } = await sb
    .from("v_api_key_balance")
    .select("user_id, balance_usd")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) {
    return json({ success: false, message: "Balance lookup failed." }, 500);
  }

  if (!row) {
    return json({
      success: false,
      message: "Invalid API key. Log in at theraiapi.com to check your credentials.",
    }, 401);
  }

  const balance = parseFloat(String(row.balance_usd));
  if (!Number.isFinite(balance) || balance <= 0) {
    return json({
      success: false,
      message: `Your account is active, but your balance is $${balance}. Please top up to continue.`,
    }, 402);
  }

  urlObj.searchParams.delete("api_key");
  
  // Create the merged payload from URL parameters and body
  const mergedPayload = {
    ...(bodyJson ?? {}),
    ...Object.fromEntries(urlObj.searchParams.entries()),
    user_id: row.user_id,
    api_key: apiKey,
    auth_method: authMethod, 
  };

  // Special handling for email-based requests
  if (authMethod === "email" && bodyJson?.body) {
    console.log("[swiss] Processing email payload with body:", bodyJson.body);
    
    // Extract the body content and use it as the "request" field
    mergedPayload.request = String(bodyJson.body);
    
    // Set subject as additional metadata if available
    if (bodyJson.subject) {
      mergedPayload.email_subject = bodyJson.subject;
    }
    
    // Remove the original body field as we've now extracted its content
    delete mergedPayload.body;
    
    console.log("[swiss] Transformed email payload:", mergedPayload);
  }

  const { status, text } = await translate(mergedPayload);

  // Only log non-report requests here, reports are logged by the standard-report function
  const isReportRequest = mergedPayload.request === "reports" || (mergedPayload.report && ["standard", "premium"].includes(String(mergedPayload.report)));
  if (!isReportRequest) {
    // Log the request and response data into the swissdebuglogs table
    await logSwissDebug({
      apiKey,
      userId: row.user_id,
      balance,
      requestType: mergedPayload.request || "unknown",
      payload: mergedPayload
    }, status, text);
  }

  return new Response(text, { status, headers: corsHeaders });
});
