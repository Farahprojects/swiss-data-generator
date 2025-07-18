import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate } from "../_shared/translator.ts";
import { buildTranslatorPayload, determineProductId } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportData = Record<string, any>;

// SWISS PROCESSING
async function processSwissDataInBackground(guestReportId: string, reportData: ReportData, supabase: any, productId: string) {
  let swissData: any;
  let swissError: string | null = null;

  try {
    const { payload } = await buildTranslatorPayload(productId, reportData, supabase);
    const translatorPayload = {
      ...payload,
      is_guest: true,
      user_id: guestReportId,
    };

    // ⭐ [VERIFY-GUEST-PAYMENT] Calling translator with guest report ID
    console.log("⭐ [VERIFY-GUEST-PAYMENT] translator_call", { 
      guestReportId, 
      guestReportId_type: typeof guestReportId,
      is_guest: true,
      translatorPayload_keys: Object.keys(translatorPayload),
      translatorPayload_user_id: translatorPayload.user_id,
      translatorPayload_user_id_type: typeof translatorPayload.user_id,
      file: "verify-guest-payment/index.ts:166",
      function: "processSwissDataInBackground"
    });

    const translated = await translate(translatorPayload);
    swissData = JSON.parse(translated.text);

    // ⭐ [VERIFY-GUEST-PAYMENT] Translator completed successfully
    console.log("⭐ [VERIFY-GUEST-PAYMENT] translator_success", { 
      guestReportId, 
      guestReportId_type: typeof guestReportId,
      has_swiss_data: !!swissData?.swiss_data,
      response_status: translated.status,
      swiss_data_keys: swissData ? Object.keys(swissData) : null,
      file: "verify-guest-payment/index.ts:172",
      function: "processSwissDataInBackground"
    });

    await supabase
      .from("guest_reports")
      .update({
        has_report: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestReportId);

  } catch (err: any) {
    swissError = err.message;
    // ⭐ [VERIFY-GUEST-PAYMENT] Translator failed
    console.error("⭐ [VERIFY-GUEST-PAYMENT] translator_error", { 
      guestReportId, 
      error: err.message,
      request_type: reportData.request || reportData.reportType,
      file: "verify-guest-payment/index.ts:178",
      function: "processSwissDataInBackground"
    });
    
    swissData = {
      error: true,
      error_message: err.message,
      timestamp: new Date().toISOString(),
    };

    // Log error to report_logs table for reliable error detection
    await supabase
      .from("report_logs")
      .insert({
        user_id: guestReportId.toString(), // Ensure it's treated as string for TEXT column
        endpoint: reportData.request || reportData.reportType || 'unknown',
        report_type: reportData.reportType,
        status: 'failed',
        error_message: err.message,
        duration_ms: null,
        engine_used: 'translator'
      });

    await supabase
      .from("guest_reports")
      .update({
        has_report: false,
        updated_at: new Date().toISOString(),
      })
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

      // For free sessions, extract product_id from report_data or determine it
      const freeProductId = record.report_data?.product_id || determineProductId(record.report_data);
      
      // Determine if this is an AI report for free sessions
      const { isAiReport } = await buildTranslatorPayload(freeProductId, record.report_data, supabase);
      
      // Update the guest report with is_ai_report flag
      await supabase
        .from("guest_reports")
        .update({ is_ai_report: isAiReport })
        .eq("id", record.id);
      
      EdgeRuntime.waitUntil(
        processSwissDataInBackground(record.id, record.report_data, supabase, freeProductId)
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

    const stripeMetadata = session.metadata;
    const productId = stripeMetadata?.product_id || determineProductId(reportData);

    // Determine if this is an AI report based on price_list.endpoint
    const { isAiReport } = await buildTranslatorPayload(productId, reportData, supabase);

    const insertData: any = {
      stripe_session_id: session.id,
      email: reportData.email,
      report_type: reportData.reportType || null,
      amount_paid: (session.amount_total ?? 0) / 100,
      report_data: reportData,
      payment_status: "paid",
      purchase_type: md.purchase_type || "report",
      is_ai_report: isAiReport,
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

    EdgeRuntime.waitUntil(
      processSwissDataInBackground(guestRec.id, reportData, supabase, productId)
    );

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
