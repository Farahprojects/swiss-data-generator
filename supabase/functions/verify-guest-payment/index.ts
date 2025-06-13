
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mapReportTypeToSwissRequest = (reportType: string): string => {
  // Map complete report types to swiss request types
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

const formatDateForSwiss = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return dateString;
  }
};

const callSwissEphemerisAPI = async (reportData: any): Promise<any> => {
  const requestType = mapReportTypeToSwissRequest(reportData.reportType);
  if (requestType === "unknown") {
    throw new Error(`Invalid report type: ${reportData.reportType}`);
  }

  const swissUrl = `${Deno.env.get("SWISS_EPHEMERIS_URL")}/${requestType}`;
  if (!Deno.env.get("SWISS_EPHEMERIS_URL")) {
    throw new Error("SWISS_EPHEMERIS_URL environment variable not set");
  }

  const payload: any = {
    birth_day: formatDateForSwiss(reportData.birthDate),
    latitude: parseFloat(reportData.birthLatitude),
    longitude: parseFloat(reportData.birthLongitude),
  };

  if (['sync_personal', 'sync_professional'].includes(reportData.reportType)) {
    if (reportData.secondPersonBirthDate && reportData.secondPersonLatitude && reportData.secondPersonLongitude) {
      payload.birth_day2 = formatDateForSwiss(reportData.secondPersonBirthDate);
      payload.latitude2 = parseFloat(reportData.secondPersonLatitude);
      payload.longitude2 = parseFloat(reportData.secondPersonLongitude);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const endpoint = `${swissUrl}/${requestType}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await response.text();
    if (!response.ok) throw new Error(`Swiss API error: ${response.status} - ${text}`);

    try {
      return JSON.parse(text);
    } catch {
      return { raw_response: text };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Swiss API request timed out');
    throw error;
  }
};

const processSwissDataInBackground = async (guestReportId: string, reportData: any, supabase: any) => {
  let swissData = null;
  let swissError = null;

  try {
    swissData = await callSwissEphemerisAPI(reportData);
  } catch (error) {
    swissError = error.message;
    swissData = {
      error: true,
      error_message: error.message,
      timestamp: new Date().toISOString(),
      attempted_payload: {
        request: mapReportTypeToSwissRequest(reportData.reportType),
        birth_day: reportData.birthDate,
        latitude: reportData.birthLatitude,
        longitude: reportData.birthLongitude,
      }
    };
  }

  await supabase.from("guest_reports").update({
    swiss_data: swissData,
    has_report: !swissError,
    updated_at: new Date().toISOString(),
  }).eq("id", guestReportId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-04-10",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    const { data: existingRecord } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (existingRecord) {
      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: existingRecord.payment_status,
        reportData: existingRecord.report_data,
        guestReportId: existingRecord.id,
        swissData: existingRecord.swiss_data,
        message: "Payment already verified and recorded"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") throw new Error(`Payment not completed. Status: ${session.payment_status}`);

    const reportData = {
      email: session.metadata?.guest_email || session.customer_details?.email,
      amount: session.metadata?.amount,
      description: session.metadata?.description,
      reportType: session.metadata?.reportType, // This now contains the complete report type
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
    };

    const { data: guestReportData, error: insertError } = await supabase
      .from("guest_reports")
      .insert({
        stripe_session_id: session.id,
        email: reportData.email,
        report_type: reportData.reportType, // Save the complete report type here
        amount_paid: (session.amount_total || 0) / 100,
        report_data: reportData,
        payment_status: "paid",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create guest report record: ${insertError.message}`);
    }

    EdgeRuntime.waitUntil(processSwissDataInBackground(guestReportData.id, reportData, supabase));

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData: guestReportData.report_data,
      guestReportId: guestReportData.id,
      swissProcessing: true,
      message: "Payment verified and Swiss data processing started"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      verified: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
