import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate } from "../_shared/translator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportData = Record<string, any>;

const mapReportTypeToRequest = (rt: string) => ({
  essence_personal: "essence",
  essence_professional: "essence",
  essence_relational: "essence",
  sync_personal: "sync",
  sync_professional: "sync",
  flow: "flow",
  mindset: "mindset",
  monthly: "monthly",
  focus: "focus",
}[rt] ?? "unknown");

function assertPresent(obj: Record<string, any>, keys: string[]) {
  const missing = keys.filter(k => {
    const v = obj[k];
    return v === undefined || v === null || v === "" || Number.isNaN(v);
  });
  if (missing.length) {
    throw new Error(`Missing fields: ${missing.join(", ")}`);
  }
}

// MAIN ROUTER
function buildTranslatorPayload(rd: ReportData) {
  const hasRequest = !!rd.request?.trim();
  const hasReportType = !!rd.reportType?.trim();

  if (hasRequest && !hasReportType) return buildAstroPayload(rd);
  if (hasReportType && !hasRequest) return buildAiPayload(rd);

  throw new Error(`Ambiguous or invalid payload: must contain either 'request' or 'reportType', not both`);
}

// ASTRODATA PATH (raw request field)
function buildAstroPayload(rd: ReportData) {
  const request = rd.request?.trim();

  if (!["essence", "sync"].includes(request)) {
    throw new Error(`Invalid AstroData request: '${request}'`);
  }

  if (request === "essence") {
    assertPresent(rd, ["birthDate", "birthTime", "birthLatitude", "birthLongitude"]);

    return {
      request,
      birth_date: rd.birthDate,
      birth_time: rd.birthTime,
      latitude: parseFloat(rd.birthLatitude),
      longitude: parseFloat(rd.birthLongitude),
      name: rd.name ?? "Guest",
    };
  }

  if (request === "sync") {
    assertPresent(rd, [
      "birthDate", "birthTime", "birthLatitude", "birthLongitude",
      "secondPersonBirthDate", "secondPersonBirthTime",
      "secondPersonLatitude", "secondPersonLongitude",
    ]);

    return {
      request,
      person_a: {
        birth_date: rd.birthDate,
        birth_time: rd.birthTime,
        latitude: parseFloat(rd.birthLatitude),
        longitude: parseFloat(rd.birthLongitude),
        name: rd.name ?? "A",
      },
      person_b: {
        birth_date: rd.secondPersonBirthDate,
        birth_time: rd.secondPersonBirthTime,
        latitude: parseFloat(rd.secondPersonLatitude),
        longitude: parseFloat(rd.secondPersonLongitude),
        name: rd.secondPersonName ?? "B",
      },
      relationship_type: rd.relationshipType ?? "general",
    };
  }

  throw new Error(`Unhandled AstroData request type: '${request}'`);
}

// AI REPORT PATH (reportType → mapped request)
function buildAiPayload(rd: ReportData) {
  const reportType = rd.reportType;
  const request = mapReportTypeToRequest(reportType);

  if (!request || request === "unknown") {
    throw new Error(`Unsupported AI reportType: '${reportType}'`);
  }

  const payload: Record<string, any> = {
    request,
    name: rd.name ?? "Guest",
  };

  if (["essence", "flow", "mindset", "monthly", "focus"].includes(request)) {
    assertPresent(rd, ["birthDate", "birthTime", "birthLatitude", "birthLongitude"]);

    Object.assign(payload, {
      birth_date: rd.birthDate,
      birth_time: rd.birthTime,
      latitude: parseFloat(rd.birthLatitude),
      longitude: parseFloat(rd.birthLongitude),
      report: reportType,
    });

    return payload;
  }

  if (request === "sync") {
    assertPresent(rd, [
      "birthDate", "birthTime", "birthLatitude", "birthLongitude",
      "secondPersonBirthDate", "secondPersonBirthTime",
      "secondPersonLatitude", "secondPersonLongitude",
    ]);

    return {
      request,
      person_a: {
        birth_date: rd.birthDate,
        birth_time: rd.birthTime,
        latitude: parseFloat(rd.birthLatitude),
        longitude: parseFloat(rd.birthLongitude),
        name: rd.name ?? "A",
      },
      person_b: {
        birth_date: rd.secondPersonBirthDate,
        birth_time: rd.secondPersonBirthTime,
        latitude: parseFloat(rd.secondPersonLatitude),
        longitude: parseFloat(rd.secondPersonLongitude),
        name: rd.secondPersonName ?? "B",
      },
      relationship_type: rd.relationshipType ?? "general",
      report: reportType,
    };
  }

  throw new Error(`Unhandled AI request type: '${request}'`);
}

// SWISS PROCESSING
async function processSwissDataInBackground(guestReportId: string, reportData: ReportData, supabase: any) {
  let swissData: any;
  let swissError: string | null = null;

  try {
    const payload = {
      ...buildTranslatorPayload(reportData),
      is_guest: true,
      user_id: guestReportId,
    };

    console.log("[guest_verify_payment] Translator payload →", payload);

    const translated = await translate(payload);
    swissData = JSON.parse(translated.text);

    const { data: insertedLog, error: insertError } = await supabase
      .from("translator_logs")
      .insert({
        user_id: guestReportId,
        request_type: payload.request,
        request_payload: reportData,
        translator_payload: payload,
        swiss_data: swissData,
        response_status: 200,
        is_guest: true,
        report_tier: payload.request,
      })
      .select("id")
      .single();

    if (insertError || !insertedLog) throw new Error(`Failed to insert translator_log: ${insertError?.message}`);

    await supabase
      .from("guest_reports")
      .update({
        translator_log_id: insertedLog.id,
        has_report: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestReportId);

  } catch (err: any) {
    swissError = err.message;
    swissData = {
      error: true,
      error_message: err.message,
      timestamp: new Date().toISOString(),
      attempted_payload: reportData,
    };

    const { data: insertedLog } = await supabase
      .from("translator_logs")
      .insert({
        user_id: guestReportId,
        request_type: reportData.request || "unknown",
        request_payload: reportData,
        error_message: swissError,
        response_status: 500,
        is_guest: true,
      })
      .select("id")
      .single();

    const updateData: any = {
      has_report: false,
      updated_at: new Date().toISOString(),
    };

    if (insertedLog) updateData.translator_log_id = insertedLog.id;

    await supabase
      .from("guest_reports")
      .update(updateData)
      .eq("id", guestReportId);
  }
}

// MAIN HANDLER
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const isFree = sessionId.startsWith("free_");

    if (isFree) {
      const { data: record, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !record) throw new Error("Free session not found");

      if (record.translator_log_id) {
        return new Response(JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: "free",
          reportData: record.report_data,
          guestReportId: record.id,
          message: "Free session already processed",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      EdgeRuntime.waitUntil(
        processSwissDataInBackground(record.id, record.report_data, supabase)
      );

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: "free",
        reportData: record.report_data,
        guestReportId: record.id,
        swissProcessing: true,
        message: "Free session verified; Swiss processing started",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY") ?? "",
      { apiVersion: "2024-04-10" }
    );

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error(`Payment not completed (status: ${session.payment_status})`);
    }

    const md = session.metadata ?? {};
    if (md.purchase_type === "service") {
      const { error: serviceInsertErr } = await supabase
        .from("service_purchases")
        .upsert({
          stripe_session_id: session.id,
          email: session.customer_details?.email ?? null,
          coach_slug: md.coach_slug ?? null,
          coach_name: md.coach_name ?? null,
          service_title: md.service_title ?? null,
          amount_paid: (session.amount_total ?? 0) / 100,
          currency: session.currency,
          purchase_type: "service",
          payment_status: "paid",
        }, { onConflict: "stripe_session_id" });

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: session.payment_status,
        amountPaid: session.amount_total,
        currency: session.currency,
        isService: true,
        coach_slug: md.coach_slug || null,
        coach_name: md.coach_name || null,
        service_title: md.service_title || null,
        message: "Service purchase verified successfully",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reportData: ReportData = {
      email: md.guest_email || session.customer_details?.email,
      amount: md.amount,
      description: md.description,
      reportType: md.reportType,
      request: md.request,
      sessionId: session.id,
      birthDate: md.birthDate,
      birthTime: md.birthTime,
      birthLocation: md.birthLocation,
      birthLatitude: md.birthLatitude,
      birthLongitude: md.birthLongitude,
      secondPersonName: md.secondPersonName,
      secondPersonBirthDate: md.secondPersonBirthDate,
      secondPersonBirthTime: md.secondPersonBirthTime,
      secondPersonBirthLocation: md.secondPersonBirthLocation,
      secondPersonLatitude: md.secondPersonLatitude,
      secondPersonLongitude: md.secondPersonLongitude,
      relationshipType: md.relationshipType,
      essenceType: md.essenceType,
      returnYear: md.returnYear,
      notes: md.notes,
      promoCode: md.promoCode,
      name: md.guest_name || "Guest",
      is_guest: true,
    };

    if (reportData.reportType || reportData.request) {
      buildTranslatorPayload(reportData); // validate
    }

    const insertData: any = {
      stripe_session_id: session.id,
      email: reportData.email,
      report_type: reportData.reportType || null,
      amount_paid: (session.amount_total ?? 0) / 100,
      report_data: reportData,
      payment_status: "paid",
      purchase_type: md.purchase_type || "report",
    };

    if (md.coach_slug) {
      insertData.coach_slug = md.coach_slug;
      insertData.coach_name = md.coach_name || null;

      const { data: coachData } = await supabase
        .from("coach_websites")
        .select("coach_id")
        .eq("site_slug", md.coach_slug)
        .single();

      if (coachData?.coach_id) insertData.coach_id = coachData.coach_id;
    }

    const { data: guestRec, error: insertErr } = await supabase
      .from("guest_reports")
      .insert(insertData)
      .select()
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    if (reportData.reportType || reportData.request) {
      EdgeRuntime.waitUntil(
        processSwissDataInBackground(guestRec.id, reportData, supabase)
      );
    }

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData: guestRec.report_data,
      guestReportId: guestRec.id,
      swissProcessing: !!(reportData.reportType || reportData.request),
      message: "Payment verified; Swiss processing started",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[verify-guest-payment] Error:", err.message);
    return new Response(JSON.stringify({
      success: false,
      verified: false,
      error: err.message,
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
