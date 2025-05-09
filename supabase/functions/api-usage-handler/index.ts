
/* ========================================================================== *
  Supabase Edge Function – API Usage Handler
  Trigger: pg_net → called by DB trigger when a translator_log row is inserted
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ─────────────────────────── ENV ───────────────────────────────────────── */

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
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

    if (logErr || !log)
      return json({ error: "Log not found" }, 404);

    const {
      user_id,
      request_type,
      google_geo,
      report_tier,
      response_status,
      processing_time_ms,
    } = log;

    /* ── skip non-billable rows ────────────────────────────────────────── */
    if (response_status !== 200) return json({ message: "Skipped failed request" });
    if (!user_id)                return json({ message: "Skipped anonymous request" });

    /* ── price lookup (strict) ─────────────────────────────────────────── */
    let q = sb
      .from("price_list")
      .select("unit_price_usd")
      .eq("endpoint", request_type);

    q = report_tier ? q.eq("report_tier", report_tier)
                    : q.is("report_tier", null);

    const { data: priceRow, error: priceErr } = await q.maybeSingle();
    if (priceErr) return json({ error: "Price lookup error" }, 500);
    if (!priceRow || priceRow.unit_price_usd == null)
      return json({
        error: "Pricing entry missing",
        details: { endpoint: request_type, report_tier },
      }, 422);

    const unitPrice = parseFloat(String(priceRow.unit_price_usd));
    console.log(`Found price for ${request_type}: ${unitPrice}`);

    /* ── total cost ────────────────────────────────────────────────────── */
    let total = unitPrice;
    if (google_geo) total += 0.005;   // geo-lookup surcharge

    /* ── record usage row ──────────────────────────────────────────────── */
    const { error: usageErr } = await sb.from("api_usage").insert({
      user_id,
      translator_log_id: log_id,
      endpoint: request_type,
      report_tier,
      used_geo_lookup: google_geo,
      unit_price_usd: unitPrice,
      total_cost_usd: total,
    });
    if (usageErr) return json({ error: "Error recording usage" }, 500);

    /* ── debit user credits via RPC ────────────────────────────────────── */
    const { error: creditErr } = await sb.rpc("record_api_usage", {
      _user_id: user_id,
      _endpoint: request_type,
      _cost_usd: total,
      _request_params: null,
      _response_status: response_status,
      _processing_time_ms: processing_time_ms,
    });
    
    if (creditErr) {
      console.error("Error updating user credits:", creditErr.message);
      return json({ error: "Error updating credits: " + creditErr.message }, 500);
    }

    return json({
      success: true,
      details: {
        user_id,
        endpoint: request_type,
        unit_price_usd: unitPrice,
        total_cost_usd: total,
        geo_lookup_used: google_geo,
      },
    });
  } catch (err) {
    console.error("api-usage-handler error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

console.log("API-usage handler ready");
