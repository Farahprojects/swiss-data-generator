
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportData = Record<string, any>;

// Helper function to kick translator-edge for Swiss processing
async function kickTranslator(guestReportId: string, reportData: ReportData, requestId: string, supabase: any): Promise<void> {
  try {
    console.log(`🔄 [verify-guest-payment] Starting translator-edge for guest: ${guestReportId}`);
    
    // SMART REQUEST EXTRACTION: Extract base type from compound reportType
    let smartRequest = reportData.request;
    
    // If no request field exists or it's empty/null, extract from reportType
    if (!smartRequest && reportData.reportType) {
      smartRequest = reportData.reportType.split('_')[0]; // Take first word before underscore
      console.log(`🧠 [verify-guest-payment] Smart extraction: "${reportData.reportType}" → request: "${smartRequest}"`);
    }
    
    // If request exists but contains underscores (compound format), extract base type
    if (smartRequest && smartRequest.includes('_')) {
      const originalRequest = smartRequest;
      smartRequest = smartRequest.split('_')[0];
      console.log(`🧠 [verify-guest-payment] Smart extraction from request: "${originalRequest}" → "${smartRequest}"`);
    }
    
    // Prepare payload with smart request field
    const translatorPayload = {
      ...reportData,
      request: smartRequest, // Use the intelligently extracted request
      is_guest: true,
      user_id: guestReportId,
      request_id: requestId // Pass the request_id for correlation
    };
    
    console.log(`🔄 [verify-guest-payment] Translator payload (structured):`, {
      request: translatorPayload.request,
      reportType: translatorPayload.reportType,
      person_a: translatorPayload.person_a ? `name: ${translatorPayload.person_a.name}, birth_date: ${translatorPayload.person_a.birth_date}` : 'missing',
      person_b: translatorPayload.person_b ? `name: ${translatorPayload.person_b.name}, birth_date: ${translatorPayload.person_b.birth_date}` : 'not provided',
      user_id: translatorPayload.user_id,
      request_id: translatorPayload.request_id
    });
    
    await supabase.functions.invoke('translator-edge', {
      body: translatorPayload
    });

    console.log(`✅ [verify-guest-payment] translator-edge invoked for guest: ${guestReportId}`);
  } catch (err) {
    console.error(`❌ [verify-guest-payment] translator-edge failed for guest: ${guestReportId}`, err);
    // Don't throw - this is fire-and-forget
  }
}

// Helper to determine if this is an AI report (needed for UI flags)
async function isAiReport(productId: string, supabase: any): Promise<boolean> {
  const { data: priceRow } = await supabase
    .from("price_list")
    .select("endpoint")
    .eq("id", productId)
    .single();
    
  return priceRow?.endpoint === "report";
}

// LEGACY: Create guest_reports record from Stripe metadata (backward compatibility)
async function createGuestReportFromLegacyMetadata(sessionId: string, session: any, supabase: any): Promise<string> {
  const md = session.metadata ?? {};
  
  console.log(`🔄 [verify-guest-payment] Creating legacy guest report for session: ${sessionId}`);

  // Extract report data from Stripe metadata (legacy format)
  const reportData = {
    name: md.name || '',
    birthDate: md.birthDate || '',
    birthTime: md.birthTime || '',
    birthLocation: md.birthLocation || '',
    birthLatitude: md.birthLatitude || '',
    birthLongitude: md.birthLongitude || '',
    reportType: md.reportType || md.priceId || 'essence',
    product_id: md.priceId || md.reportType || 'essence',
    essenceType: md.essenceType || '',
    // Add any other fields that might be in legacy metadata
    secondPersonName: md.secondPersonName || '',
    secondPersonBirthDate: md.secondPersonBirthDate || '',
    secondPersonBirthTime: md.secondPersonBirthTime || '',
    secondPersonBirthLocation: md.secondPersonBirthLocation || '',
    secondPersonLatitude: md.secondPersonLatitude || '',
    secondPersonLongitude: md.secondPersonLongitude || '',
    relationshipType: md.relationshipType || '',
    returnYear: md.returnYear || ''
  };

  // Create guest_reports record
  const { data: guestReport, error: insertError } = await supabase
    .from("guest_reports")
    .insert({
      stripe_session_id: sessionId,
      email: session.customer_details?.email || 'legacy@unknown.com',
      payment_status: 'paid', // Already verified from Stripe
      amount_paid: (session.amount_total ?? 0) / 100,
      report_type: reportData.reportType,
      report_data: reportData,
      promo_code_used: md.promo_code_used || null,
      coach_slug: md.coach_slug || null,
      coach_name: md.coach_name || null,
      is_ai_report: true, // Default for legacy reports
    })
    .select()
    .single();

  if (insertError) {
    // Check if it's a unique constraint violation (already exists)
    if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
      console.log(`🔄 [verify-guest-payment] Legacy guest report already exists for session: ${sessionId}`);
      
      // Fetch existing record
      const { data: existingReport, error: fetchError } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (fetchError || !existingReport) {
        throw new Error(`Failed to fetch existing guest report: ${fetchError?.message}`);
      }

      return existingReport.id;
    }
    
    throw new Error(`Failed to create legacy guest report: ${insertError.message}`);
  }

  console.log(`✅ [verify-guest-payment] Legacy guest report created: ${guestReport.id}`);

  return guestReport.id;
}

// Helper function to log performance timing
async function logPerformanceTiming(
  requestId: string,
  stage: string,
  guestReportId: string,
  startTime: number,
  endTime: number,
  metadata: any,
  supabase: any
) {
  try {
    const duration = endTime - startTime;
    await supabase.from("performance_timings").insert({
      request_id: requestId,
      stage,
      guest_report_id: guestReportId,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_ms: duration,
      metadata
    });
    console.log(`📊 [verify-guest-payment] Performance logged - ${stage}: ${duration}ms`);
  } catch (error) {
    console.error(`❌ [verify-guest-payment] Performance logging failed:`, error);
  }
}

// MAIN HANDLER
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const stageStartTime = Date.now();
  let guestReportId = "unknown";

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    console.log(`🔄 [verify-guest-payment] Starting verification for session: ${sessionId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const isFree = sessionId.startsWith("free_");

    if (isFree) {
      console.log(`🔄 [verify-guest-payment] Processing free session: ${sessionId}`);

      const { data: record, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !record) {
        console.error(`❌ [verify-guest-payment] Free session not found: ${sessionId}`, error);
        throw new Error("Free session not found");
      }

      guestReportId = record.id;
      console.log(`✅ [verify-guest-payment] Free session found: ${guestReportId}`);

      // Enhanced idempotency check for free sessions
      if (record.translator_log_id) {
        console.log(`🔄 [verify-guest-payment] Free session already processed: ${guestReportId}`);

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: "free",
          reportData: record.report_data,
          guestReportId: record.id,
          message: "Free session already processed (idempotent response)",
          idempotent: true,
          processing_time_ms: Date.now() - stageStartTime
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // For free sessions, extract product_id from report_data
      const freeProductId = record.report_data?.product_id || record.report_data?.reportType || record.report_data?.request || "essence";
      
      // Determine if this is an AI report for free sessions
      const isAiReportFlag = await isAiReport(freeProductId, supabase);
      
      // Update the guest report with is_ai_report flag
      await supabase
        .from("guest_reports")
        .update({ is_ai_report: isAiReportFlag })
        .eq("id", record.id);
      
      // Log performance timing before handing over to translator
      const stageEndTime = Date.now();
      EdgeRuntime.waitUntil(
        logPerformanceTiming(
          requestId,
          'verify_guest_payment',
          record.id,
          stageStartTime,
          stageEndTime,
          {
            session_id: sessionId,
            product_id: freeProductId,
            payment_type: 'free',
            is_ai_report: isAiReportFlag
          },
          supabase
        )
      );

      // Start translator-edge processing (fire-and-forget)
      // Data is already in correct structure from useReportSubmission
      EdgeRuntime.waitUntil(
        kickTranslator(record.id, record.report_data, requestId, supabase)
      );

      console.log(`✅ [verify-guest-payment] Free session Swiss processing started: ${guestReportId}`);

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: "free",
        reportData: record.report_data,
        guestReportId: record.id,
        swissProcessing: true,
        message: "Free session verified; Swiss processing started",
        processing_time_ms: Date.now() - stageStartTime
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PAID FLOW - Enhanced verification with Stripe
    console.log(`🔄 [verify-guest-payment] Starting Stripe verification for: ${sessionId}`);

    const stripe = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY") ?? "",
      { apiVersion: "2024-04-10" }
    );

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log(`✅ [verify-guest-payment] Stripe session retrieved: ${sessionId}, status: ${session.payment_status}`);

    if (session.payment_status !== "paid") {
      console.error(`❌ [verify-guest-payment] Payment not completed: ${session.payment_status}`);
      throw new Error(`Payment not completed (status: ${session.payment_status})`);
    }

    const md = session.metadata ?? {};
    
    // Handle service purchases
    if (md.purchase_type === "service") {
      console.log(`🔄 [verify-guest-payment] Service purchase detected: ${sessionId}`);

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
        processing_time_ms: Date.now() - stageStartTime
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // **CRITICAL: BACKWARD COMPATIBILITY CHECK**
    // Check if this is a legacy session (no guest_report_id in metadata)
    guestReportId = md.guest_report_id;

    if (!guestReportId) {
      console.log(`🔄 [verify-guest-payment] Legacy session detected: ${sessionId}`);

      // LEGACY FLOW: Create guest_reports record from Stripe metadata
      try {
        guestReportId = await createGuestReportFromLegacyMetadata(sessionId, session, supabase);
        
        console.log(`✅ [verify-guest-payment] Legacy guest report ready: ${guestReportId}`);

        // Extract product_id and report_data for legacy session
        const legacyReportData = {
          product_id: md.priceId || md.reportType || 'essence',
          reportType: md.reportType || md.priceId || 'essence',
          name: md.name || '',
          birthDate: md.birthDate || '',
          birthTime: md.birthTime || '',
          birthLocation: md.birthLocation || '',
          birthLatitude: md.birthLatitude || '',
          birthLongitude: md.birthLongitude || '',
          essenceType: md.essenceType || '',
          secondPersonName: md.secondPersonName || '',
          secondPersonBirthDate: md.secondPersonBirthDate || '',
          secondPersonBirthTime: md.secondPersonBirthTime || '',
          secondPersonBirthLocation: md.secondPersonBirthLocation || '',
          secondPersonLatitude: md.secondPersonLatitude || '',
          secondPersonLongitude: md.secondPersonLongitude || '',
          relationshipType: md.relationshipType || '',
          returnYear: md.returnYear || ''
        };

        // Log performance timing for legacy session
        const legacyStageEndTime = Date.now();
        EdgeRuntime.waitUntil(
          logPerformanceTiming(
            requestId,
            'verify_guest_payment',
            guestReportId,
            stageStartTime,
            legacyStageEndTime,
            {
              session_id: sessionId,
              product_id: md.priceId || md.reportType || 'essence',
              payment_type: 'legacy_paid',
              stripe_amount: session.amount_total
            },
            supabase
          )
        );

        // Start translator-edge processing for legacy session
        EdgeRuntime.waitUntil(
          kickTranslator(guestReportId, legacyReportData, requestId, supabase)
        );

        console.log(`✅ [verify-guest-payment] Legacy payment verification completed: ${guestReportId}`);

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: session.payment_status,
          amountPaid: session.amount_total,
          currency: session.currency,
          reportData: legacyReportData,
          guestReportId: guestReportId,
          swissProcessing: true,
          legacy: true,
          message: "LEGACY: Payment verified; Swiss processing started",
          processing_time_ms: Date.now() - stageStartTime
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (legacyError: any) {
        console.error(`❌ [verify-guest-payment] Legacy session failed: ${sessionId}`, legacyError);
        throw new Error(`Legacy session processing failed: ${legacyError.message}`);
      }
    }

    // NEW STAGE 1 FLOW: guest_report_id exists in metadata
    console.log(`🔄 [verify-guest-payment] Stage 1 session detected: ${guestReportId}`);

    // STAGE 1: Query database for all necessary data
    const { data: existingReport, error: queryError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guestReportId)
      .single();

    if (queryError || !existingReport) {
      console.error(`❌ [verify-guest-payment] Guest report not found: ${guestReportId}`, queryError);
      throw new Error(`Guest report not found in database: ${guestReportId}`);
    }

    console.log(`✅ [verify-guest-payment] Guest report found: ${guestReportId}, payment_status: ${existingReport.payment_status}`);

    // CRITICAL IDEMPOTENCY CHECK
    if (existingReport.payment_status === "paid") {
      console.log(`🔄 [verify-guest-payment] Payment already processed (idempotent): ${guestReportId}`);

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: "paid",
        amountPaid: session.amount_total,
        currency: session.currency,
        reportData: existingReport.report_data,
        guestReportId: existingReport.id,
        message: "Payment already verified and processed (idempotent response)",
        idempotent: true,
        processing_time_ms: Date.now() - stageStartTime
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate payment status transition
    if (existingReport.payment_status !== "pending") {
      console.error(`❌ [verify-guest-payment] Invalid payment status transition: ${existingReport.payment_status}`);
      throw new Error(`Invalid payment status: expected 'pending', got '${existingReport.payment_status}'`);
    }

    // Extract product_id from database (not Stripe metadata)
    const productId = existingReport.report_data?.product_id;

    if (!productId) {
      console.error(`❌ [verify-guest-payment] Missing product_id: ${guestReportId}`);
      throw new Error("Missing product_id in guest_reports.report_data - database corruption");
    }

    console.log(`🔄 [verify-guest-payment] Processing payment for product: ${productId}`);

    // Determine if this is an AI report based on price_list.endpoint
    const isAiReportFlag = await isAiReport(productId, supabase);

    const updateData: any = {
      payment_status: "paid",
      is_ai_report: isAiReportFlag
    };

    // Update coach information if present in metadata (for backwards compatibility)
    if (md.coach_slug) {
      updateData.coach_slug = md.coach_slug;
      updateData.coach_name = md.coach_name || null;

      const { data: coachData } = await supabase
        .from("coach_websites")
        .select("coach_id")
        .eq("site_slug", md.coach_slug)
        .single();

      if (coachData?.coach_id) updateData.coach_id = coachData.coach_id;
    }

    // Atomic operation - Update payment status
    const { data: updatedReport, error: updateErr } = await supabase
      .from("guest_reports")
      .update(updateData)
      .eq("id", guestReportId)
      .eq("payment_status", "pending") // Ensure we only update if still pending (optimistic locking)
      .select()
      .single();

    if (updateErr) {
      console.error(`❌ [verify-guest-payment] Payment status update failed: ${guestReportId}`, updateErr);
      throw new Error(`DB update failed: ${updateErr.message}`);
    }

    if (!updatedReport) {
      console.error(`❌ [verify-guest-payment] Concurrent payment processing: ${guestReportId}`);
      throw new Error("Payment may have been processed concurrently");
    }

    console.log(`✅ [verify-guest-payment] Payment status updated to paid: ${guestReportId}`);

    // Log performance timing before handing over to translator
    const paidStageEndTime = Date.now();
    EdgeRuntime.waitUntil(
      logPerformanceTiming(
        requestId,
        'verify_guest_payment',
        guestReportId,
        stageStartTime,
        paidStageEndTime,
        {
          session_id: sessionId,
          product_id: productId,
          payment_type: 'paid',
          stripe_amount: session.amount_total,
          is_ai_report: isAiReportFlag
        },
        supabase
      )
    );

    // Start translator-edge processing (fire-and-forget)
    // Data is already in correct structure from useReportSubmission
    EdgeRuntime.waitUntil(
      kickTranslator(updatedReport.id, updatedReport.report_data, requestId, supabase)
    );

    const processingTimeMs = Date.now() - stageStartTime;

    console.log(`✅ [verify-guest-payment] Payment verification completed: ${guestReportId}, processing_time: ${processingTimeMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData: updatedReport.report_data,
      guestReportId: updatedReport.id,
      swissProcessing: true,
      message: "Payment verified; Swiss processing started",
      processing_time_ms: processingTimeMs
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    const processingTimeMs = Date.now() - stageStartTime;
    
    console.error(`❌ [verify-guest-payment] Verification failed: ${guestReportId}`, err);

    return new Response(JSON.stringify({
      success: false,
      verified: false,
      error: err.message,
      processing_time_ms: processingTimeMs
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
