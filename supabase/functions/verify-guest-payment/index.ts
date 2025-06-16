
// supabase/functions/guest_verify_payment.ts
// Edge Function: verifies Stripe/"free" sessions, records the guest report,
// ▸ Changes
//   • strict validation so ONLY translator-ready payloads are built
//   • unified payload builder for every report type
//   • clearer failures if something is missing
//   • always sends birth_day + birth_time (or rejects)
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
  const request = mapReportTypeToRequest(rd.reportType);

  if (request === "unknown") {
    throw new Error(`Unsupported reportType '${rd.reportType}'`);
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
        birth_day:  rd.birthDate,
        birth_time: rd.birthTime,
        latitude:   parseFloat(rd.birthLatitude),
        longitude:  parseFloat(rd.birthLongitude),
        name:       rd.name ?? "A",
      },
      person_b: {
        birth_day:  rd.secondPersonBirthDate,
        birth_time: rd.secondPersonBirthTime,
        latitude:   parseFloat(rd.secondPersonLatitude),
        longitude:  parseFloat(rd.secondPersonLongitude),
        name:       rd.secondPersonName ?? "B",
      },
      relationship_type: rd.relationshipType ?? "general",
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

  try {
    const payload = buildTranslatorPayload(reportData);
    console.log("[guest_verify_payment] Translator payload →", payload);

    const translated = await translate(payload);
    swissData = JSON.parse(translated.text);
  } catch (err: any) {
    swissError = err.message;
    swissData  = {
      error:            true,
      error_message:    err.message,
      timestamp:        new Date().toISOString(),
      attempted_payload: reportData,
    };
  }

  await supabase
    .from("guest_reports")
    .update({
      swiss_data:  swissData,
      has_report:  !swissError,
      updated_at:  new Date().toISOString(),
    })
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

    // ─────────── “FREE” SESSIONS ───────────
    if (isFree) {
      const { data: record, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !record) throw new Error("Free session not found");

      // If Swiss already processed, just return it
      if (record.swiss_data) {
        return new Response(JSON.stringify({
          success:       true,
          verified:      true,
          paymentStatus: "free",
          reportData:    record.report_data,
          guestReportId: record.id,
          swissData:     record.swiss_data,
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
    };

    // Build translator payload early to fail fast on bad metadata
    buildTranslatorPayload(reportData);                 // throws if invalid

    // Insert DB record
    const { data: guestRec, error: insertErr } = await supabase
      .from("guest_reports")
      .insert({
        stripe_session_id: session.id,
        email:             reportData.email,
        report_type:       reportData.reportType,
        amount_paid:       (session.amount_total ?? 0) / 100,
        report_data:       reportData,
        payment_status:    "paid",
      })
      .select()
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

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
      message:        "Payment verified; Swiss processing started",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[guest_verify_payment] Error:", err.message);
    return new Response(JSON.stringify({
      success:  false,
      verified: false,
      error:    err.message,
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
