import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map frontend report types to Swiss API request types
const mapReportTypeToSwissRequest = (reportType: string): string => {
  const mapping: { [key: string]: string } = {
    'essence': 'essence',
    'flow': 'flow',
    'mindset': 'mindset',
    'monthly': 'monthly',
    'focus': 'focus',
    'sync': 'sync',
  };

  return mapping[reportType] || 'unknown';
};

// Format date for Swiss API (assuming it expects YYYY-MM-DD format)
const formatDateForSwiss = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    console.error('❌ Error formatting date:', error);
    return dateString; // Return original if parsing fails
  }
};

// Call Swiss Ephemeris API directly
const callSwissEphemerisAPI = async (reportData: any): Promise<any> => {
  const swissUrl = Deno.env.get("SWISS_EPHEMERIS_URL");
  
  if (!swissUrl) {
    throw new Error("SWISS_EPHEMERIS_URL environment variable not set");
  }

  // Validate required fields
  if (!reportData.birthDate || !reportData.birthLatitude || !reportData.birthLongitude) {
    throw new Error("Missing required birth data: date, latitude, or longitude");
  }

  // Map frontend fields to Swiss API expected fields
  const swissPayload = {
    request: mapReportTypeToSwissRequest(reportData.reportType),
    birth_day: formatDateForSwiss(reportData.birthDate),
    latitude: parseFloat(reportData.birthLatitude),
    longitude: parseFloat(reportData.birthLongitude),
  };

  // Add second person data for synastry reports
  if (['sync', 'compatibility'].includes(reportData.reportType)) {
    if (reportData.secondPersonBirthDate && reportData.secondPersonLatitude && reportData.secondPersonLongitude) {
      swissPayload.birth_day2 = formatDateForSwiss(reportData.secondPersonBirthDate);
      swissPayload.latitude2 = parseFloat(reportData.secondPersonLatitude);
      swissPayload.longitude2 = parseFloat(reportData.secondPersonLongitude);
    }
  }

  console.log("🔄 Calling Swiss Ephemeris API with payload:", JSON.stringify(swissPayload, null, 2));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(swissUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(swissPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📡 Swiss API Response Status: ${response.status}`);

    const responseText = await response.text();
    console.log("📋 Swiss API Response Body:", responseText);

    if (!response.ok) {
      throw new Error(`Swiss API error: ${response.status} - ${responseText}`);
    }

    // Try to parse as JSON, fallback to text if parsing fails
    let swissData;
    try {
      swissData = JSON.parse(responseText);
    } catch (parseError) {
      console.warn("⚠️ Swiss API response is not valid JSON, storing as text");
      swissData = { raw_response: responseText };
    }

    return swissData;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Swiss API request timed out after 30 seconds');
    }
    
    throw error;
  }
};

// Background task to process Swiss API
const processSwissDataInBackground = async (guestReportId: string, reportData: any, supabase: any) => {
  console.log("🔄 Starting background Swiss API processing for report:", guestReportId);
  
  let swissData = null;
  let swissError = null;

  try {
    swissData = await callSwissEphemerisAPI(reportData);
    console.log("✅ Background Swiss API call successful");
  } catch (error) {
    swissError = error.message;
    console.error("❌ Background Swiss API call failed:", error);
    
    // Create error object to store in swiss_data
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

  // Update the guest report with Swiss data
  console.log("💾 Updating guest report with Swiss data in background...");
  const { error: updateError } = await supabase
    .from("guest_reports")
    .update({
      swiss_data: swissData,
      has_report: !swissError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestReportId);

  if (updateError) {
    console.error("❌ Error updating guest report with Swiss data:", updateError);
  } else {
    console.log("✅ Background Swiss data processing completed for report:", guestReportId);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    console.log("🔍 Starting payment verification for session:", sessionId);

    if (!sessionId) {
      console.error("❌ No session ID provided");
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-04-10",
    });

    // Initialize Supabase with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    console.log("🔐 Initialized Stripe and Supabase clients");

    // Check if we already have a record for this session
    const { data: existingRecord, error: checkError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows found
      console.error("❌ Error checking existing record:", checkError);
    } else if (existingRecord) {
      console.log("✅ Found existing guest report record:", existingRecord.id);
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: existingRecord.payment_status,
          reportData: existingRecord.report_data,
          guestReportId: existingRecord.id,
          swissData: existingRecord.swiss_data,
          message: "Payment already verified and recorded"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve the checkout session from Stripe
    console.log("🔎 Fetching session from Stripe...");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("📋 Session retrieved from Stripe:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      customer: session.customer,
      metadata_keys: session.metadata ? Object.keys(session.metadata) : []
    });

    // Verify that payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ Payment not completed. Status:", session.payment_status);
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    console.log("✅ Payment verified as paid");

    // Extract metadata for report generation
    const reportData = {
      email: session.metadata?.guest_email || session.customer_details?.email,
      amount: session.metadata?.amount,
      description: session.metadata?.description,
      reportType: session.metadata?.reportType,
      sessionId: session.id,
      // Birth data
      birthDate: session.metadata?.birthDate,
      birthTime: session.metadata?.birthTime,
      birthLocation: session.metadata?.birthLocation,
      birthLatitude: session.metadata?.birthLatitude,
      birthLongitude: session.metadata?.birthLongitude,
      birthPlaceId: session.metadata?.birthPlaceId,
      // Second person data (for compatibility reports)
      secondPersonName: session.metadata?.secondPersonName,
      secondPersonBirthDate: session.metadata?.secondPersonBirthDate,
      secondPersonBirthTime: session.metadata?.secondPersonBirthTime,
      secondPersonBirthLocation: session.metadata?.secondPersonBirthLocation,
      secondPersonLatitude: session.metadata?.secondPersonLatitude,
      secondPersonLongitude: session.metadata?.secondPersonLongitude,
      secondPersonPlaceId: session.metadata?.secondPersonPlaceId,
      // Other metadata
      relationshipType: session.metadata?.relationshipType,
      essenceType: session.metadata?.essenceType,
      returnYear: session.metadata?.returnYear,
      notes: session.metadata?.notes,
      promoCode: session.metadata?.promoCode,
    };

    console.log("📊 Extracted report data:", {
      email: reportData.email,
      reportType: reportData.reportType,
      amount: reportData.amount,
      hasBirthData: !!(reportData.birthDate && reportData.birthLatitude && reportData.birthLongitude),
      metadataFields: Object.keys(reportData).length
    });

    // Insert into guest_reports table to track this payment
    console.log("💾 Inserting guest report record...");
    const { data: guestReportData, error: insertError } = await supabase
      .from("guest_reports")
      .insert({
        stripe_session_id: session.id,
        email: reportData.email,
        report_type: reportData.reportType || "unknown",
        amount_paid: (session.amount_total || 0) / 100, // Convert cents to dollars
        report_data: reportData,
        payment_status: "paid",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting guest report record:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw new Error(`Failed to create guest report record: ${insertError.message}`);
    }

    console.log("✅ Guest report record created successfully:", {
      id: guestReportData.id,
      email: guestReportData.email,
      reportType: guestReportData.report_type,
      amountPaid: guestReportData.amount_paid
    });

    // Start Swiss API processing in the background (don't await)
    EdgeRuntime.waitUntil(
      processSwissDataInBackground(guestReportData.id, reportData, supabase)
    );

    console.log("🎉 Payment verification completed successfully - Swiss processing started in background");

    // Return verified payment details immediately
    const response = {
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData: guestReportData.report_data,
      guestReportId: guestReportData.id,
      swissProcessing: true, // Indicate that Swiss processing is happening in background
      message: "Payment verified and Swiss data processing started"
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Payment verification failed:", {
      message: error.message,
      stack: error.stack
    });
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
