
// redeploy trigger: 2025-05-10-100

/* ========================================================================== *
  Supabase Edge Function – API Usage Handler
  Trigger: pg_net → called by DB trigger when a translator_log row is inserted
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ─────────────────────────── ENV ───────────────────────────────────────── */

const SUPABASE_URL  = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
if (!SUPABASE_URL || !SERVICE_KEY)
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

/* ────────────────────────── HELPERS ───────────────────────────────────── */

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* ─────────────────────────── HANDLER ───────────────────────────────────── */

serve(async (req) => {
  /* CORS pre-flight */
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  try {
    console.log("API Usage Handler function initialized");
    
    const { log_id } = await req.json();
    if (!log_id) return json({ error: "Missing log_id parameter" }, 400);

    console.log(`Processing log ID: ${log_id}`);

    /* ── fetch log ─────────────────────────────────────────────────────── */
    const { data: log, error: logErr } = await sb
      .from("translator_logs")
      .select("*")
      .eq("id", log_id)
      .single();

    if (logErr || !log) {
      console.error("Error fetching translator log:", logErr?.message || "Log not found");
      return json({ error: "Log not found" }, 404);
    }

    const {
      user_id,
      request_type,
      google_geo,
      report_tier,
      response_status,
      processing_time_ms,
      is_guest,
    } = log;

    console.log(`Log found. User: ${user_id}, Request type: ${request_type}, Report tier: ${report_tier}`);

    /* ── skip non-billable rows ────────────────────────────────────────── */
    if (response_status !== 200) {
      console.log(`Skipping failed request with status: ${response_status}`);
      return json({ message: "Skipped failed request" });
    }
    
    if (!user_id) {
      console.log("Skipping anonymous request (no user_id)");
      return json({ message: "Skipped anonymous request" });
    }

    /* ── price lookup (with fallback) ─────────────────────────────────────── */
    let q = sb
      .from("price_list")
      .select("unit_price_usd")
      .eq("endpoint", request_type);

    if (report_tier) {
      q = q.eq("report_tier", report_tier);
    } else {
      q = q.is("report_tier", null);
    }

    const { data: priceRow, error: priceErr } = await q.maybeSingle();
    
    if (priceErr) {
      console.error("Price lookup error:", priceErr.message);
      return json({ error: "Price lookup error" }, 500);
    }
    
    // If no exact match found, try with null report tier as fallback
    let unitPrice = 0;
    if (!priceRow || priceRow.unit_price_usd == null) {
      console.log("No exact price match found, trying fallback lookup");
      
      const { data: fallbackPriceRow } = await sb
        .from("price_list")
        .select("unit_price_usd")
        .eq("endpoint", request_type)
        .is("report_tier", null)
        .maybeSingle();
      
      if (fallbackPriceRow && fallbackPriceRow.unit_price_usd != null) {
        unitPrice = parseFloat(String(fallbackPriceRow.unit_price_usd));
        console.log(`Found fallback price for ${request_type}: ${unitPrice}`);
      } else {
        console.warn(`No pricing entry found for: ${request_type} (${report_tier})`);
        // Using a minimal default price rather than failing
        unitPrice = 0.001; 
        console.log(`Using default price: ${unitPrice}`);
      }
    } else {
      unitPrice = parseFloat(String(priceRow.unit_price_usd));
      console.log(`Found price for ${request_type}: ${unitPrice}`);
    }

    /* ── total cost ────────────────────────────────────────────────────── */
    let total = unitPrice;
    if (google_geo) {
      total += 0.005;   // geo-lookup surcharge
      console.log("Added geo-lookup surcharge: +0.005");
    }

    console.log(`Total cost: ${total}`);

    /* ── record usage row ──────────────────────────────────────────────── */
    const { data: usageData, error: usageErr } = await sb.from("api_usage").insert({
      user_id,
      endpoint: request_type,
      report_tier,
      used_geo_lookup: google_geo,
      unit_price_usd: unitPrice,
      total_cost_usd: total,
    }).select();
    
    if (usageErr) {
      console.error("Error recording usage:", usageErr.message);
      return json({ error: "Error recording usage: " + usageErr.message }, 500);
    }
    
    console.log(`Successfully inserted api_usage record: ${usageData?.[0]?.id || 'unknown id'}`);

    /* ── debit user credits via RPC (skip for guests) ────────────────────────────────────── */
    let creditData = null;
    let creditErr = null;
    
    if (!is_guest) {
      // Only deduct credits for authenticated users, not guests
      const { data: creditResult, error: creditError } = await sb.rpc("record_api_usage", {
      _user_id: user_id,
      _endpoint: request_type,
      _cost_usd: total,
      _response_status: response_status,
      _processing_time_ms: processing_time_ms,
    });
      
      creditData = creditResult;
      creditErr = creditError;
    
    if (creditErr) {
      console.error("Error updating user credits:", creditErr.message);
      return json({ error: "Error updating credits: " + creditErr.message }, 500);
    }
    
    console.log(`Successfully debited user credits: ${creditData || 'unknown reference'}`);
    } else {
      console.log(`Skipping credit deduction for guest user: ${user_id}`);
    }

    return json({
      success: true,
      details: {
        user_id,
        endpoint: request_type,
        unit_price_usd: unitPrice,
        total_cost_usd: total,
        geo_lookup_used: google_geo,
        api_usage_id: usageData?.[0]?.id || null,
        credit_transaction_id: creditData || null,
      },
    });
  } catch (err) {
    console.error("api-usage-handler error:", err);
    return json({ error: "Internal server error: " + (err as Error).message }, 500);
  }
});

console.log("API-usage handler ready");
