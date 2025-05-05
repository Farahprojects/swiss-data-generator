
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Config and headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Helper for JSON responses
const jsonResponse = (body, status = 200) => 
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

// Create Supabase client
const createSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(url, serviceKey);
};

// API key validation
const validateApiKey = async (key) => {
  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("api_key", key)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return data && data.is_active ? data.user_id : null;
  } catch (error) {
    console.error(`API key validation error: ${error.message}`);
    throw error;
  }
};

// Record API usage
const recordUsage = async (userId) => {
  try {
    const supabase = createSupabase();
    await supabase
      .from("api_usage")
      .insert({ user_id: userId, service: "swiss_ephemeris" });
  } catch (error) {
    console.warn(`Usage recording error: ${error.message}`);
  }
};

// Get API key from request
const getApiKey = async (req) => {
  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : authHeader;
  }

  // Check query parameter
  const url = new URL(req.url);
  const keyInQuery = url.searchParams.get("api_key");
  if (keyInQuery) return keyInQuery;

  // Check JSON body
  if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await req.clone().json();
      if (body?.api_key) return body.api_key;
    } catch (_) {
      // Ignore JSON parsing errors
    }
  }

  return null;
};

// Call Swiss Ephemeris API
const callSwissEphemerisApi = async (data) => {
  const swissEphemerisUrl = Deno.env.get("SWISS_EPHEMERIS_URL");
  if (!swissEphemerisUrl) {
    throw new Error("Swiss Ephemeris URL is not configured");
  }

  try {
    const response = await fetch(swissEphemerisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Swiss Ephemeris API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling Swiss Ephemeris API: ${error.message}`);
    throw error;
  }
};

// Main handler
serve(async (req) => {
  const { method, url } = req;
  const timestamp = new Date().toISOString();
  console.log(`Request: ${timestamp} ${method} ${url}`);

  // Handle CORS preflight
  if (method === "OPTIONS") return jsonResponse({}, 204);

  // Only allow POST
  if (method !== "POST") {
    return jsonResponse({ success: false, message: "Only POST method is allowed" }, 405);
  }

  try {
    // Validate API key
    const apiKey = await getApiKey(req);
    if (!apiKey) {
      return jsonResponse({
        success: false,
        message: "API key required. Supply it in Authorization header, query parameter, or request body.",
      }, 401);
    }

    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return jsonResponse({ success: false, message: "Invalid or inactive API key." }, 401);
    }

    // Process the request
    const requestData = await req.json();
    const ephemerisResult = await callSwissEphemerisApi(requestData);
    
    // Record usage
    await recordUsage(userId);

    // Return the result
    return jsonResponse({
      success: true,
      data: ephemerisResult,
      user_id: userId,
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return jsonResponse({
      success: false,
      message: "Error processing request.",
      error: err?.message || "Unknown error",
    }, 500);
  }
});
