import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate } from "./_shared/translator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mapReportTypeToSwissRequest = (reportType: string): string => {
  const mapping: { [key: string]: string } = {
    'essence_personal': 'essence',
    'essence_professional': 'essence',
    'essence_relational': 'essence',
    'sync_personal': 'sync',
    'sync_professional': 'sync',
    'flow': 'flow',
    'mindset': 'mindset',
    'monthly': 'monthly',
    'focus': 'focus',
  };
  return mapping[reportType] || 'unknown';
};

const processSwissDataInBackground = async (
  guestReportId: string,
  reportData: any,
  supabase: any
) => {
  let swissData = null;
  let swissError = null;

  try {
    const mappedRequestType = mapReportTypeToSwissRequest(reportData.reportType);

    const payload = {
      request: mappedRequestType,
      birth_date: reportData.birthDate ?? null,
      birth_time: reportData.birthTime ?? null,
      latitude: reportData.birthLatitude ? parseFloat(reportData.birthLatitude) : null,
      longitude: reportData.birthLongitude ? parseFloat(reportData.birthLongitude) : null,
      name: reportData.name || "Guest",
    };

    console.log("Sending to translator:", payload);

    const translated = await translate(payload);
    swissData = JSON.parse(translated.text);
  } catch (error) {
    swissError = error.message;
    swissData = {
      error: true,
      error_message: error.message,
      timestamp: new Date().toISOString(),
      attempted_payload: reportData,
    };
  }

  await supabase
    .from("guest_reports")
    .update({
      swiss_data: swissData,
      has_report: !swissError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestReportId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    const isFreeSession = sessionId.startsWith("free_");

    if (isFreeSession) {
      const { data: existingRecord, error: fetchError } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (fetchError || !existingRecord) {
        return new Response(
          JSON.stringify({ error: "Free session not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (existingRecord.swiss_data) {
        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            paymentStatus: "free",
            reportData: existingRecord.report_data,
            guestReportId: existingRecord.id,
            swissData: existingRecord.swiss_data,
            message: "Free session already processed",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      EdgeRuntime.waitUntil(
        processSwissDataInBackground(
          existingRecord.id,
          existingRecord.report_data,
          supabase
        )
      );

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: "free",
          reportData: existingRecord.report_data,
          guestReportId: existingRecord.id,
          swissProcessing: true,
          message: "Free session verified and Swiss data processing started",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-04-10",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid")
      throw new Error(
        `Payment not completed. Status: ${session.payment_status}`
      );

    const reportData = {
      email: session.metadata?.guest_email || session.customer_details?.email,
      amount: session.metadata?.amount,
      description: session.metadata?.description,
      reportType: session.metadata?.reportType,
      sessionId: session.id,
      birthDate: session.metadata?.birthDate,
      birthTime: session.metadata?.birthTime,
      birthLocation: session.metadata?.birthLocation,
      birthLatitude: session.metadata?.birthLatitude,
      birthLongitude: session.metadata?.birthLongitude,
      secondPersonName: session.metadata?.secondPersonName,
      secondPersonBirthDate: session.metadata?.secondPersonBirthDate,
      secondPersonBirthTime: session.metadata?.secondPersonBirthTime,
      secondPersonBirthLocation: session.metadata?.secondPersonBirthLocation,
      secondPersonLatitude: session.metadata?.secondPersonLatitude,
      secondPersonLongitude: session.metadata?.secondPersonLongitude,
      relationshipType: session.metadata?.relationshipType,
      essenceType: session.metadata?.essenceType,
      returnYear: session.metadata?.returnYear,
      notes: session.metadata?.notes,
      promoCode: session.metadata?.promoCode,
      name: session.metadata?.guest_name || "Guest",
    };

    const { data: guestReportData, error: insertError } = await supabase
      .from("guest_reports")
      .insert({
        stripe_session_id: session.id,
        email: reportData.email,
        report_type: reportData.reportType,
        amount_paid: (session.amount_total || 0) / 100,
        report_data: reportData,
        payment_status: "paid",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `Failed to create guest report record: ${insertError.message}`
      );
    }

    EdgeRuntime.waitUntil(
      processSwissDataInBackground(guestReportData.id, reportData, supabase)
    );

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: session.payment_status,
        amountPaid: session.amount_total,
        currency: session.currency,
        reportData: guestReportData.report_data,
        guestReportId: guestReportData.id,
        swissProcessing: true,
        message: "Payment verified and Swiss data processing started",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
