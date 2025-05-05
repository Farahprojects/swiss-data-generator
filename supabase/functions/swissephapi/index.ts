
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

// ──────────────────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────────────────
const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
): Response =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

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
// Swiss Ephemeris API call function
// ──────────────────────────────────────────────────────────────────────────
const callSwissEphemerisApi = async (data: any) => {
  const swissEphemerisUrl = Deno.env.get("SWISS_EPHEMERIS_URL");
  
  if (!swissEphemerisUrl) {
    throw new Error("Swiss Ephemeris URL is not configured");
  }

  try {
    console.log(`Calling Swiss Ephemeris API at: ${swissEphemerisUrl}`);
    console.log(`With data: ${JSON.stringify(data)}`);
    
    const response = await fetch(swissEphemerisUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Swiss Ephemeris API error: ${response.status}, ${errorText}`);
      throw new Error(`Swiss Ephemeris API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Swiss Ephemeris API response: ${JSON.stringify(result)}`);
    
    return result;
  } catch (error) {
    console.error(`Error calling Swiss Ephemeris API: ${error.message}`);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Authentication & validation
// ──────────────────────────────────────────────────────────────────────────
const getApiKey = async (req: Request): Promise<string | null> => {
  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
    return authHeader; // raw key
  }

  // Check query parameter
  const url = new URL(req.url);
  const keyInQuery = url.searchParams.get("api_key");
  if (keyInQuery) {
    return keyInQuery;
  }

  // Check JSON body
  if (
    req.method === "POST" &&
    req.headers.get("content-type")?.includes("application/json")
  ) {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();
      if (body?.api_key) {
        return body.api_key;
      }
    } catch (_) {
      // Ignore JSON parsing errors
    }
  }

  return null;
};

const validateApiKey = async (key: string) => {
  console.log(`Validating API key: ${key.substring(0, 5)}...`);
  const supabase = createSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", key)
    .maybeSingle();
  
  if (error) {
    console.error(`API key validation error: ${error.message}`);
    throw new Error(error.message);
  }
  
  return data && data.is_active ? data.user_id as string : null;
};

const recordUsage = async (userId: string) => {
  console.log(`Recording Swiss Ephemeris API usage for user: ${userId}`);
  const supabase = createSupabase();
  const { error } = await supabase
    .from("api_usage")
    .insert({ user_id: userId, service: "swiss_ephemeris" });
  if (error) console.warn(`Usage recording error: ${error.message}`);
};

// ──────────────────────────────────────────────────────────────────────────
// Main entry
// ──────────────────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  const { method, url } = req;
  const debug = `[${new Date().toISOString()}]`;
  console.log(`Swiss Ephemeris API function invoked: ${new Date().toISOString()}`);
  console.log(`Request URL: ${url}`);
  console.log(`Request method: ${method}`);

  // Handle CORS preflight
  if (method === "OPTIONS") return jsonResponse({}, 204);

  // Only allow POST
  if (method !== "POST") {
    console.info(`${debug} 405 ${method} ${url}`);
    return jsonResponse(
      { success: false, message: "Only POST method is allowed" },
      405,
    );
  }

  try {
    // Validate API key
    const apiKey = await getApiKey(req);
    if (!apiKey) {
      console.info(`${debug} 401 missing-key ${url}`);
      return jsonResponse(
        {
          success: false,
          message: "API key required. Supply it in Authorization header, query parameter, or request body.",
        },
        401,
      );
    }

    const userId = await validateApiKey(apiKey);
    if (!userId) {
      console.info(`${debug} 401 invalid-key ${url}`);
      return jsonResponse(
        { success: false, message: "Invalid or inactive API key." },
        401,
      );
    }

    // Process the request body to get parameters for Swiss Ephemeris
    const requestData = await req.json();
    console.log(`Request data: ${JSON.stringify(requestData)}`);

    // Call the Swiss Ephemeris API
    const ephemerisResult = await callSwissEphemerisApi(requestData);

    // Record the API usage
    await recordUsage(userId);

    // Return the Swiss Ephemeris API response
    console.info(`${debug} 200 ok user=${userId} ${url}`);
    return jsonResponse({
      success: true,
      data: ephemerisResult,
      user_id: userId,
    });
  } catch (err: any) {
    console.error(`${debug} Error: `, err);
    return jsonResponse(
      {
        success: false,
        message: "Error processing request.",
        error: err?.message || "Unknown error",
      },
      500,
    );
  }
});
