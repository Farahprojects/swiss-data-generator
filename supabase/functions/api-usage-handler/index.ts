
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

/* ────────────────────────────── HANDLER ────────────────────────────────── */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { log_id } = await req.json();
    
    if (!log_id) {
      return new Response(
        JSON.stringify({ error: "Missing log_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Log not found or error retrieving log" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ message: "Skipped failed request" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!user_id) {
      console.log("Skipping usage calculation for request without user_id");
      return new Response(
        JSON.stringify({ message: "Skipped anonymous request" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get pricing for this endpoint from price_list
    const { data: priceData, error: priceError } = await supabase
      .from("price_list")
      .select("unit_price_usd")
      .eq("endpoint", request_type)
      .eq("report_tier", report_tier || 'standard')  // Default to standard tier if not specified
      .maybeSingle();
    
    if (priceError) {
      console.error("Error fetching price data:", priceError.message);
      return new Response(
        JSON.stringify({ error: "Error retrieving price data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If no specific price found, try getting the default price for the endpoint
    let unitPrice = priceData?.unit_price_usd;
    
    if (!unitPrice) {
      const { data: defaultPriceData } = await supabase
        .from("price_list")
        .select("unit_price_usd")
        .eq("endpoint", request_type)
        .is("report_tier", null)
        .maybeSingle();
      
      unitPrice = defaultPriceData?.unit_price_usd;
    }
    
    // If still no price found, use a fallback price
    if (!unitPrice) {
      console.warn(`No price found for endpoint ${request_type}, using default price of 0.01`);
      unitPrice = 0.01;
    }
    
    // Calculate total cost (add geo lookup cost if used)
    let totalCost = unitPrice;
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
      return new Response(
        JSON.stringify({ error: "Error recording API usage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Error updating user credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Successfully processed usage for log ${log_id}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "API usage calculated and recorded",
        details: {
          user_id,
          endpoint: request_type,
          unit_price: unitPrice,
          total_cost: totalCost,
          geo_lookup_used: google_geo
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Unexpected error in api-usage-handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("API Usage Handler function initialized");
