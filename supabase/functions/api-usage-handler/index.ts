
/* ========================================================================== *
  Supabase Edge Function - API Usage Handler
  Author: Lovable
  Purpose: Process new translator logs and calculate API usage costs
  Trigger: Called by database trigger via pg_net when new logs are added
  Runtime: Deno Deploy / Supabase Edge
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ────────────────────────────── ENV ────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}

/* ─────────────────────────── CLIENTS ───────────────────────────────────── */

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ───────────────────────────── CORS  ───────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

/* ────────────────────────── HELPERS ──────────────────────────────────── */

function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/* ────────────────────────────── HANDLER ────────────────────────────────── */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { log_id } = await req.json();
    
    if (!log_id) {
      return jsonResponse({ error: "Missing log_id parameter" }, 400);
    }
    
    console.log(`Processing log ID: ${log_id}`);
    
    // Fetch the translator log entry
    const { data: logData, error: logError } = await supabase
      .from("translator_logs")
      .select("*")
      .eq("id", log_id)
      .single();
    
    if (logError || !logData) {
      console.error("Error fetching log data:", logError?.message || "No log found");
      return jsonResponse({ error: "Log not found or error retrieving log" }, 404);
    }
    
    // Extract relevant data from the log
    const { 
      user_id, 
      request_type, 
      google_geo, 
      report_tier, 
      response_status 
    } = logData;
    
    // Skip processing if response status is not 200 (successful request)
    if (response_status !== 200) {
      console.log(`Skipping usage calculation for failed request (status ${response_status})`);
      return jsonResponse({ message: "Skipped failed request" }, 200);
    }
    
    if (!user_id) {
      console.log("Skipping usage calculation for request without user_id");
      return jsonResponse({ message: "Skipped anonymous request" }, 200);
    }
    
    // Get pricing for this endpoint from price_list
    // IMPROVED LOGIC: Only filter by report_tier if it exists
    let priceQuery = supabase
      .from("price_list")
      .select("unit_price_usd")
      .eq("endpoint", request_type);
      
    if (report_tier) {
      priceQuery = priceQuery.eq("report_tier", report_tier);
    } else {
      priceQuery = priceQuery.is("report_tier", null);
    }
    
    const { data: priceData, error: priceError } = await priceQuery.maybeSingle();
    
    if (priceError) {
      console.error("Error fetching price data:", priceError.message);
      return jsonResponse({ error: "Error retrieving price data" }, 500);
    }
    
    // Use the unit price if found
    let unitPrice = priceData?.unit_price_usd;
    
    // Calculate total cost (add geo lookup cost if used) - use parseFloat for explicit conversion
    let totalCost = parseFloat(String(unitPrice));
    if (google_geo) {
      // Add $0.005 for Google geocoding API usage
      totalCost += 0.005;
    }
    
    // Record API usage
    const { error: usageError } = await supabase
      .from("api_usage")
      .insert({
        user_id,
        endpoint: request_type,
        translator_log_id: log_id,
        unit_price_usd: unitPrice,
        total_cost_usd: totalCost,
        used_geo_lookup: google_geo,
        report_tier
      });
    
    if (usageError) {
      console.error("Error recording API usage:", usageError.message);
      return jsonResponse({ error: "Error recording API usage" }, 500);
    }
    
    // Update user credits
    const { error: creditsError } = await supabase.rpc("record_api_usage", {
      _user_id: user_id,
      _endpoint: request_type,
      _cost_usd: totalCost,
      _request_params: null,
      _response_status: response_status,
      _processing_time_ms: logData.processing_time_ms
    });
    
    if (creditsError) {
      console.error("Error updating user credits:", creditsError.message);
      return jsonResponse({ error: "Error updating user credits" }, 500);
    }
    
    console.log(`Successfully processed usage for log ${log_id}`);
    return jsonResponse({ 
      success: true, 
      message: "API usage calculated and recorded",
      details: {
        user_id,
        endpoint: request_type,
        unit_price: unitPrice,
        total_cost: totalCost,
        geo_lookup_used: google_geo
      }
    });
    
  } catch (error) {
    console.error("Unexpected error in api-usage-handler:", error);
    return jsonResponse({ error: "Internal server error", details: error.message }, 500);
  }
});

console.log("API Usage Handler function initialized");
