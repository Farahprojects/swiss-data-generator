
// Edge Function: verifies Stripe/"free" sessions, records the guest report,
// ▸ Changes
//   • strict validation so ONLY translator-ready payloads are built
//   • unified payload builder for every report type
//   • clearer failures if something is missing
//   • always sends birth_day + birth_time (or rejects the requst and updates)
//   • UPDATED: pass guest_report_id as user_id to translator for tracing
//   • UPDATED: handle coach reports and service routing
//   • FIXED: properly handle service purchases without report processing
//
// ---------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe      from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate }    from "../_shared/translator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type ReportData = Record<string, any>;

const mapReportTypeToRequest = (rt: string) => ({
  essence_personal:     "essence",
  essence_professional: "essence",
  essence_relational:   "essence",
  sync_personal:        "sync",
  sync_professional:    "sync",
  flow:                 "flow",
  mindset:              "mindset",
  monthly:              "monthly",
  focus:                "focus",
}[rt] ?? "unknown");

// Throw if any required field is empty/undefined/NaN
function assertPresent(obj: Record<string, any>, keys: string[]) {
  const missing = keys.filter(k => {
    const v = obj[k];
    return v === undefined || v === null || v === "" || Number.isNaN(v);
  });
  if (missing.length) {
    throw new Error(`Missing fields: ${missing.join(", ")}`);
  }
}

function buildTranslatorPayload(rd: ReportData) {
  // Check if rd.request exists first (for astro data), otherwise map reportType
  let request;
  if (rd.request && rd.request.trim() !== '') {
    request = rd.request;
  } else {
    request = mapReportTypeToRequest(rd.reportType);
  }

  if (request === "unknown") {
    throw new Error(`Unsupported reportType '${rd.reportType}' and no request field provided`);
  }

  // Single-person endpoints
  if (["essence","flow","mindset","monthly","focus"].includes(request)) {
    assertPresent(rd, [
      "birthDate", "birthTime", "birthLatitude", "birthLongitude",
    ]);

    return {
      request,
      birth_date:  rd.birthDate,
      birth_time: rd.birthTime,                       // must be HH:MM[:SS]
      latitude:   parseFloat(rd.birthLatitude),
      longitude:  parseFloat(rd.birthLongitude),
      name:       rd.name ?? "Guest",
      report:     rd.reportType,                      // Use actual reportType instead of hardcoded "standard"
    };
  }

  // Synchronicity / compatibility endpoints
  if (request === "sync") {
    assertPresent(rd, [
      "birthDate", "birthTime", "birthLatitude", "birthLongitude",
      "secondPersonBirthDate", "secondPersonBirthTime",
      "secondPersonLatitude", "secondPersonLongitude",
    ]);

    return {
      request,
      person_a: {
        birth_date:  rd.birthDate,
        birth_time: rd.birthTime,
        latitude:   parseFloat(rd.birthLatitude),
        longitude:  parseFloat(rd.birthLongitude),
        name:       rd.name ?? "A",
      },
      person_b: {
        birth_date:  rd.secondPersonBirthDate,
        birth_time: rd.secondPersonBirthTime,
        latitude:   parseFloat(rd.secondPersonLatitude),
        longitude:  parseFloat(rd.secondPersonLongitude),
        name:       rd.secondPersonName ?? "B",
      },
      relationship_type: rd.relationshipType ?? "general",
      report:           rd.reportType,                // Use actual reportType instead of hardcoded "compatibility"
    };
  }

  throw new Error(`Unhandled request type '${request}'`);
}

async function processSwissDataInBackground(
  guestReportId: string,
  reportData: ReportData,
  supabase: any,
) {
  let swissData: any;
  let swissError: string | null = null;
  let translatorLogId: string | null = null;

  try {
    const payload = buildTranslatorPayload(reportData);
    console.log("[guest_verify_payment] Translator payload →", payload);

    // UPDATED: Pass guest report ID as user_id for tracing in translator_logs
    const translatorRequest = {
      ...payload,
      user_id: guestReportId,  // This will appear in translator_logs.user_id
      is_guest: true,          // Explicit guest flag
      skip_logging: false      // Ensure logging is enabled
    };

    const translated = await translate(translatorRequest);
    swissData = JSON.parse(translated.text);

    // Find the translator_log record that was just created
    const { data: translatorLog } = await supabase
      .from("translator_logs")
      .select("id")
      .eq("user_id", guestReportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (translatorLog) {
      translatorLogId = translatorLog.id;
    }
  } catch (err: any) {
    swissError = err.message;
    swissData  = {
      error:            true,
      error_message:    err.message,
      timestamp:        new Date().toISOString(),
      attempted_payload: reportData,
    };
  }

  // Update guest_reports with reference to translator_logs instead of duplicate data
  const updateData: any = {
    has_report:  !swissError,
    updated_at:  new Date().toISOString(),
  };

  if (translatorLogId) {
    updateData.translator_log_id = translatorLogId;
  }

  await supabase
    .from("guest_reports")
    .update(updateData)
    .eq("id", guestReportId);
}

// ────────────────────────────────────────────────────────────────────────────
// Edge Function
// ────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")             ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?? "",
      { auth: { persistSession: false } },
    );

    const isFree = sessionId.startsWith("free_");

    // ─────────── "FREE" SESSIONS ───────────
    if (isFree) {
      const { data: record, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !record) throw new Error("Free session not found");

      // If Swiss already processed, just return it
      if (record.translator_log_id) {
        return new Response(JSON.stringify({
          success:       true,
          verified:      true,
          paymentStatus: "free",
          reportData:    record.report_data,
          guestReportId: record.id,
          message:       "Free session already processed",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      EdgeRuntime.waitUntil(
        processSwissDataInBackground(record.id, record.report_data, supabase),
      );

      return new Response(JSON.stringify({
        success:       true,
        verified:      true,
        paymentStatus: "free",
        reportData:    record.report_data,
        guestReportId: record.id,
        swissProcessing: true,
        message:       "Free session verified; Swiss processing started",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────── STRIPE SESSIONS ───────────
    const stripe = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY") ?? "",
      { apiVersion: "2024-04-10" },
    );

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error(`Payment not completed (status: ${session.payment_status})`);
    }

    // Assemble reportData from metadata
    const md = session.metadata ?? {};
    
    // ────────── SERVICE PURCHASES - FIXED HANDLING ──────────
    if (md.purchase_type === 'service') {
  console.log("[guest_verify_payment] Service purchase detected - processing without report data");

  const { error: serviceInsertErr } = await supabase
    .from("service_purchases") // ✅ use your actual table name
    .upsert({
      stripe_session_id: session.id,
      email: session.customer_details?.email ?? null,
      coach_slug: md.coach_slug ?? null,
      coach_name: md.coach_name ?? null,
      service_title: md.service_title ?? null,
      amount_paid: (session.amount_total ?? 0) / 100,
      currency: session.currency,
      purchase_type: 'service',
      payment_status: 'paid',
    }, { onConflict: 'stripe_session_id' });

  if (serviceInsertErr) {
    console.error("[guest_verify_payment] Failed to log service purchase:", serviceInsertErr);
  }

  return new Response(JSON.stringify({
    success:        true,
    verified:       true,
    paymentStatus:  session.payment_status,
    amountPaid:     session.amount_total,
    currency:       session.currency,
    isService:      true,
    isCoachReport:  true,
    coach_slug:     md.coach_slug || null,
    coach_name:     md.coach_name || null,
    service_title:  md.service_title || null,
    message:        "Service purchase verified successfully",
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

    // This is a report purchase - proceed with report creation
    const reportData: ReportData = {
      email:                     md.guest_email || session.customer_details?.email,
      amount:                    md.amount,
      description:               md.description,
      reportType:                md.reportType,
      sessionId:                 session.id,
      birthDate:                 md.birthDate,
      birthTime:                 md.birthTime,
      birthLocation:             md.birthLocation,
      birthLatitude:             md.birthLatitude,
      birthLongitude:            md.birthLongitude,
      secondPersonName:          md.secondPersonName,
      secondPersonBirthDate:     md.secondPersonBirthDate,
      secondPersonBirthTime:     md.secondPersonBirthTime,
      secondPersonBirthLocation: md.secondPersonBirthLocation,
      secondPersonLatitude:      md.secondPersonLatitude,
      secondPersonLongitude:     md.secondPersonLongitude,
      relationshipType:          md.relationshipType,
      essenceType:               md.essenceType,
      returnYear:                md.returnYear,
      notes:                     md.notes,
      promoCode:                 md.promoCode,
      name:                      md.guest_name || "Guest",
      is_guest:                  true,  // Explicitly mark as guest report
    };

    // Only validate translator payload if we have a reportType (for actual reports)
    if (reportData.reportType) {
      try {
        buildTranslatorPayload(reportData);                 // throws if invalid
      } catch (err: any) {
        throw new Error(`Invalid report data: ${err.message}`);
      }
    }

    // Insert DB record with coach tracking
    const insertData: any = {
      stripe_session_id: session.id,
      email:             reportData.email,
      report_type:       reportData.reportType || null,
      amount_paid:       (session.amount_total ?? 0) / 100,
      report_data:       reportData,
      payment_status:    "paid",
      purchase_type:     md.purchase_type || 'report',
    };

    // Add coach tracking if present in metadata
    if (md.coach_slug) {
      insertData.coach_slug = md.coach_slug;
      insertData.coach_name = md.coach_name || null;
      
      // Resolve coach_id from coach_slug if available
      if (md.coach_slug) {
        const { data: coachData } = await supabase
          .from("coach_websites")
          .select("coach_id")
          .eq("site_slug", md.coach_slug)
          .single();
        
        if (coachData?.coach_id) {
          insertData.coach_id = coachData.coach_id;
        }
      }
    }

    const { data: guestRec, error: insertErr } = await supabase
      .from("guest_reports")
      .insert(insertData)
      .select()
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    // Only process Swiss data if this is an actual report with reportType
    if (reportData.reportType) {
      EdgeRuntime.waitUntil(
        processSwissDataInBackground(guestRec.id, reportData, supabase),
      );

      return new Response(JSON.stringify({
        success:        true,
        verified:       true,
        paymentStatus:  session.payment_status,
        amountPaid:     session.amount_total,
        currency:       session.currency,
        reportData:     guestRec.report_data,
        guestReportId:  guestRec.id,
        swissProcessing:true,
        isCoachReport:  !!md.coach_slug,
        coach_slug:     md.coach_slug || null,
        coach_name:     md.coach_name || null,
        message:        md.coach_slug ? "Coach report verified; Swiss processing started" : "Payment verified; Swiss processing started",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // Coach purchase without report type - just track the purchase
      return new Response(JSON.stringify({
        success:        true,
        verified:       true,
        paymentStatus:  session.payment_status,
        amountPaid:     session.amount_total,
        currency:       session.currency,
        guestReportId:  guestRec.id,
        isCoachReport:  true,
        coach_slug:     md.coach_slug || null,
        coach_name:     md.coach_name || null,
        message:        "Coach purchase verified and tracked",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

  } catch (err: any) {
    console.error("[guest_verify_payment] Error:", err.message);
    return new Response(JSON.stringify({
      success:  false,
      verified: false,
      error:    err.message,
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
