// update latest 

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate } from "../_shared/translator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportData = Record<string, any>;

// Enhanced logging function with structured format
function logPaymentEvent(event: string, guestReportId: string, details: any = {}) {
  console.log(`🔄 [VERIFY-PAYMENT-V3] ${event}`, {
    timestamp: new Date().toISOString(),
    guestReportId,
    ...details
  });
}

// Enhanced error logging function
function logPaymentError(event: string, guestReportId: string, error: any, details: any = {}) {
  console.error(`❌ [VERIFY-PAYMENT-V3] ${event}`, {
    timestamp: new Date().toISOString(),
    guestReportId,
    error: error.message || error,
    ...details
  });
}

function transformToTranslatorPayload(productRow: any, reportData: ReportData): any {
  const reportType = productRow.report_type;
  const endpoint = productRow.endpoint;

  // Map endpoint for AI reports - translator expects base endpoint, not generic "report"
  let requestEndpoint = endpoint;
  if (endpoint === 'report' && reportType) {
    // Map report types to their base endpoints
    if (reportType.startsWith('essence')) requestEndpoint = 'essence';
    else if (reportType.startsWith('sync')) requestEndpoint = 'sync';
    else if (reportType === 'flow') requestEndpoint = 'flow';
    else if (reportType === 'mindset') requestEndpoint = 'mindset';
    else if (reportType === 'monthly') requestEndpoint = 'monthly';
    else if (reportType === 'focus') requestEndpoint = 'focus';
    else if (reportType === 'return') requestEndpoint = 'return';
  }

  const basePayload: any = {
    request: requestEndpoint,
    source: 'guest'
  };

  // Handle moonphases report
  if (endpoint === 'moonphases') {
    if (reportData.returnYear) {
      basePayload.year = parseInt(reportData.returnYear);
    }
    return basePayload;
  }

  // Handle positions report
  if (endpoint === 'positions') {
    basePayload.location = reportData.birthLocation;
    basePayload.date = reportData.birthDate;
    return basePayload;
  }

  // Person-based reports - Map field names to Swiss API format
  if (reportData.name && reportData.birthDate && reportData.birthTime && reportData.birthLocation) {
    basePayload.name = reportData.name;
    basePayload.birth_date = reportData.birthDate;
    basePayload.time = reportData.birthTime;
    basePayload.location = reportData.birthLocation;
  }

  // Add timing fields if present
  if (reportData.birthLatitude) basePayload.latitude = parseFloat(reportData.birthLatitude);
  if (reportData.birthLongitude) basePayload.longitude = parseFloat(reportData.birthLongitude);
  if (reportData.returnYear) basePayload.return_date = reportData.returnYear;

  // Handle two-person reports (sync, compatibility)
  if ((requestEndpoint === 'sync' || requestEndpoint === 'compatibility') && reportData.secondPersonName) {
    basePayload.person_a = {
      name: reportData.name,
      birth_date: reportData.birthDate,
      time: reportData.birthTime,
      location: reportData.birthLocation
    };
    basePayload.person_b = {
      name: reportData.secondPersonName,
      birth_date: reportData.secondPersonBirthDate,
      time: reportData.secondPersonBirthTime,
      location: reportData.secondPersonBirthLocation
    };

    // Add coordinates if available
    if (reportData.birthLatitude) basePayload.person_a.latitude = parseFloat(reportData.birthLatitude);
    if (reportData.birthLongitude) basePayload.person_a.longitude = parseFloat(reportData.birthLongitude);
    if (reportData.secondPersonLatitude) basePayload.person_b.latitude = parseFloat(reportData.secondPersonLatitude);
    if (reportData.secondPersonLongitude) basePayload.person_b.longitude = parseFloat(reportData.secondPersonLongitude);

    // Remove individual fields for two-person reports
    delete basePayload.name;
    delete basePayload.birth_date;
    delete basePayload.time;
    delete basePayload.location;
    delete basePayload.latitude;
    delete basePayload.longitude;
  }

  // Raw chart requests (astro-only endpoints) - no report type
  if (!reportType) {
    return basePayload;
  }

  // AI report-generating payloads - add report field based on type
  if (reportType === 'essence' && reportData.essenceType) {
    // Map essence types correctly
    if (reportData.essenceType === 'personal-identity') {
      basePayload.report = 'essence_personal';
    } else if (reportData.essenceType === 'professional') {
      basePayload.report = 'essence_professional';
    } else if (reportData.essenceType === 'relational') {
      basePayload.report = 'essence_relational';
    } else {
      basePayload.report = `essence_${reportData.essenceType}`;
    }
  } else if (reportType.startsWith('sync') && reportData.relationshipType) {
    basePayload.report = `sync_${reportData.relationshipType}`;
  } else {
    // For other report types, use the report type directly
    const reportGeneratingTypes = ['return', 'essence', 'flow', 'mindset', 'monthly', 'focus'];
    if (reportGeneratingTypes.includes(reportType)) {
      basePayload.report = reportType;
    }
  }

  return basePayload;
}

async function buildTranslatorPayload(productId: string, reportData: ReportData, supabase: any): Promise<any> {
  const { data: priceRow, error } = await supabase
    .from("price_list")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !priceRow) {
    throw new Error(`Unable to find product in price_list for id: ${productId}`);
  }

  return { 
    payload: transformToTranslatorPayload(priceRow, reportData),
    isAiReport: priceRow.endpoint === "report"
  };
}

// Enhanced Swiss processing with retry logic and comprehensive error handling
async function processSwissDataInBackground(guestReportId: string, reportData: ReportData, supabase: any, productId: string, maxRetries: number = 3) {
  let swissData: any;
  let swissError: string | null = null;
  let attempt = 0;

  logPaymentEvent("swiss_processing_started", guestReportId, { productId, maxRetries });

  while (attempt < maxRetries) {
    attempt++;
    
    try {
      logPaymentEvent("swiss_processing_attempt", guestReportId, { attempt, maxRetries });

      const { payload } = await buildTranslatorPayload(productId, reportData, supabase);
      const translatorPayload = {
        ...payload,
        is_guest: true,
        user_id: guestReportId,
      };

      logPaymentEvent("translator_call_started", guestReportId, { 
        attempt,
        translatorPayload_keys: Object.keys(translatorPayload),
        endpoint: payload.request
      });

      const translated = await translate(translatorPayload);
      swissData = JSON.parse(translated.text);

      logPaymentEvent("translator_success", guestReportId, { 
        attempt,
        response_status: translated.status,
        has_swiss_data: !!swissData?.swiss_data,
        swiss_data_keys: swissData ? Object.keys(swissData) : null
      });

      logPaymentEvent("swiss_processing_completed", guestReportId, { attempt });
      return; // Success, exit retry loop

    } catch (err: any) {
      swissError = err.message;
      
      logPaymentError("translator_attempt_failed", guestReportId, err, { 
        attempt, 
        maxRetries,
        will_retry: attempt < maxRetries
      });

      // If this is the last attempt, handle the final failure
      if (attempt >= maxRetries) {
        logPaymentError("swiss_processing_failed_final", guestReportId, err, { 
          total_attempts: attempt,
          final_error: err.message
        });

        swissData = {
          error: true,
          error_message: err.message,
          timestamp: new Date().toISOString(),
          attempts: attempt
        };

        // Log comprehensive error to report_logs table
        await supabase
          .from("report_logs")
          .insert({
            user_id: guestReportId.toString(),
            endpoint: reportData.request || reportData.reportType || 'unknown',
            report_type: reportData.reportType,
            status: 'failed',
            error_message: `Final failure after ${attempt} attempts: ${err.message}`,
            duration_ms: null,
            engine_used: 'translator'
          });

        return; // Exit after final failure
      }

      // Wait before retry (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
      logPaymentEvent("swiss_retry_delay", guestReportId, { attempt, waitTime, nextAttempt: attempt + 1 });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Enhanced atomic promo code management
async function handlePromoCodeIncrement(supabase: any, promoCode: string, guestReportId: string): Promise<void> {
  if (!promoCode) return;

  logPaymentEvent("promo_increment_started", guestReportId, { promoCode });

  try {
    // Use a transaction-like approach with optimistic locking
    const { data: currentPromo, error: fetchError } = await supabase
      .from('promo_codes')
      .select('id, times_used, max_uses, is_active')
      .eq('code', promoCode.toUpperCase())
      .single();

    if (fetchError || !currentPromo) {
      logPaymentError("promo_not_found_for_increment", guestReportId, fetchError, { promoCode });
      return;
    }

    // Validate promo code is still valid
    if (!currentPromo.is_active) {
      logPaymentError("promo_inactive_during_increment", guestReportId, new Error("Promo code became inactive"), { promoCode });
      return;
    }

    if (currentPromo.max_uses && currentPromo.times_used >= currentPromo.max_uses) {
      logPaymentError("promo_limit_reached_during_increment", guestReportId, 
        new Error("Promo code limit reached"), { 
        promoCode, 
        times_used: currentPromo.times_used, 
        max_uses: currentPromo.max_uses 
      });
      return;
    }

    // Increment usage count
    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ 
        times_used: currentPromo.times_used + 1 
      })
      .eq('id', currentPromo.id)
      .eq('times_used', currentPromo.times_used); // Optimistic locking

    if (updateError) {
      logPaymentError("promo_increment_failed", guestReportId, updateError, { promoCode });
      return;
    }

    logPaymentEvent("promo_increment_success", guestReportId, { 
      promoCode, 
      old_usage: currentPromo.times_used, 
      new_usage: currentPromo.times_used + 1 
    });

  } catch (error) {
    logPaymentError("promo_increment_exception", guestReportId, error, { promoCode });
  }
}

// LEGACY: Create guest_reports record from Stripe metadata (backward compatibility)
async function createGuestReportFromLegacyMetadata(sessionId: string, session: any, supabase: any): Promise<string> {
  const md = session.metadata ?? {};
  
  logPaymentEvent("legacy_guest_report_creation", sessionId, {
    metadata_keys: Object.keys(md),
    customer_email: session.customer_details?.email
  });

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
      logPaymentEvent("legacy_guest_report_already_exists", sessionId);
      
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

  logPaymentEvent("legacy_guest_report_created", guestReport.id, {
    sessionId,
    reportType: reportData.reportType
  });

  return guestReport.id;
}

// MAIN HANDLER
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let guestReportId = "unknown";

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    logPaymentEvent("verification_started", sessionId, { sessionId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const isFree = sessionId.startsWith("free_");

    if (isFree) {
      logPaymentEvent("free_session_processing", sessionId);

      const { data: record, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (error || !record) {
        logPaymentError("free_session_not_found", sessionId, error);
        throw new Error("Free session not found");
      }

      guestReportId = record.id;
      logPaymentEvent("free_session_found", guestReportId, { 
        has_translator_log: !!record.translator_log_id,
        payment_status: record.payment_status 
      });

      // STAGE 2: Enhanced idempotency check for free sessions
      if (record.translator_log_id) {
        logPaymentEvent("free_session_already_processed", guestReportId, { 
          translator_log_id: record.translator_log_id,
          processing_time_ms: Date.now() - startTime
        });

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: "free",
          reportData: record.report_data,
          guestReportId: record.id,
          message: "Free session already processed (idempotent response)",
          idempotent: true,
          processing_time_ms: Date.now() - startTime
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // For free sessions, extract product_id from report_data
      const freeProductId = record.report_data?.product_id || record.report_data?.reportType || record.report_data?.request || "essence";
      
      // Determine if this is an AI report for free sessions
      const { isAiReport } = await buildTranslatorPayload(freeProductId, record.report_data, supabase);
      
      // Update the guest report with is_ai_report flag
      await supabase
        .from("guest_reports")
        .update({ is_ai_report: isAiReport })
        .eq("id", record.id);
      
      // Start Swiss processing in background with enhanced retry logic
      EdgeRuntime.waitUntil(
        processSwissDataInBackground(record.id, record.report_data, supabase, freeProductId, 3)
      );

      logPaymentEvent("free_session_swiss_started", guestReportId, { 
        product_id: freeProductId,
        is_ai_report: isAiReport,
        processing_time_ms: Date.now() - startTime
      });

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        paymentStatus: "free",
        reportData: record.report_data,
        guestReportId: record.id,
        swissProcessing: true,
        message: "Free session verified; Swiss processing started with enhanced retry logic",
        processing_time_ms: Date.now() - startTime
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PAID FLOW - Enhanced verification with Stripe
    logPaymentEvent("stripe_verification_started", sessionId);

    const stripe = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY") ?? "",
      { apiVersion: "2024-04-10" }
    );

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    logPaymentEvent("stripe_session_retrieved", sessionId, { 
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency
    });

    if (session.payment_status !== "paid") {
      logPaymentError("payment_not_completed", sessionId, new Error(`Payment status: ${session.payment_status}`));
      throw new Error(`Payment not completed (status: ${session.payment_status})`);
    }

    const md = session.metadata ?? {};
    
    // Handle service purchases (unchanged from Stage 1)
    if (md.purchase_type === "service") {
      logPaymentEvent("service_purchase_detected", sessionId);

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
        processing_time_ms: Date.now() - startTime
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // **CRITICAL: BACKWARD COMPATIBILITY CHECK**
    // Check if this is a legacy session (no guest_report_id in metadata)
    guestReportId = md.guest_report_id;

    if (!guestReportId) {
      logPaymentEvent("legacy_session_detected", sessionId, {
        metadata_keys: Object.keys(md),
        legacy_compatibility_mode: true
      });

      // LEGACY FLOW: Create guest_reports record from Stripe metadata
      try {
        guestReportId = await createGuestReportFromLegacyMetadata(sessionId, session, supabase);
        
        logPaymentEvent("legacy_guest_report_ready", guestReportId, {
          sessionId,
          legacy_mode: true
        });

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

        // Handle promo code increment for legacy paid reports
        await handlePromoCodeIncrement(supabase, md.promo_code_used, guestReportId);

        // Start Swiss processing for legacy session
        EdgeRuntime.waitUntil(
          processSwissDataInBackground(guestReportId, legacyReportData, supabase, legacyReportData.product_id, 3)
        );

        logPaymentEvent("legacy_payment_verification_completed", guestReportId, {
          sessionId,
          legacy_mode: true,
          swiss_processing_started: true,
          processing_time_ms: Date.now() - startTime
        });

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
          message: "LEGACY: Payment verified with backward compatibility; Swiss processing started",
          processing_time_ms: Date.now() - startTime
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (legacyError: any) {
        logPaymentError("legacy_session_failed", sessionId, legacyError);
        throw new Error(`Legacy session processing failed: ${legacyError.message}`);
      }
    }

    // NEW STAGE 1 FLOW: guest_report_id exists in metadata
    logPaymentEvent("stage1_session_detected", guestReportId, { sessionId });

    // STAGE 1: Query database for all necessary data
    const { data: existingReport, error: queryError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guestReportId)
      .single();

    if (queryError || !existingReport) {
      logPaymentError("guest_report_not_found", guestReportId, queryError);
      throw new Error(`Guest report not found in database: ${guestReportId}`);
    }

    logPaymentEvent("guest_report_found", guestReportId, {
      payment_status: existingReport.payment_status,
      has_product_id: !!(existingReport.report_data?.product_id),
      promo_code_used: existingReport.promo_code_used || 'none'
    });

    // STAGE 2: CRITICAL IDEMPOTENCY CHECK - Enhanced with comprehensive logging
    if (existingReport.payment_status === "paid") {
      logPaymentEvent("payment_already_processed_idempotent", guestReportId, {
        existing_payment_status: existingReport.payment_status,
        stripe_session_id: existingReport.stripe_session_id,
        amount_paid: existingReport.amount_paid,
        has_report: existingReport.has_report,
        processing_time_ms: Date.now() - startTime,
        idempotent_response: true
      });

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
        processing_time_ms: Date.now() - startTime,
        stage2_enhanced: true
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STAGE 2: Validate payment status transition
    if (existingReport.payment_status !== "pending") {
      logPaymentError("invalid_payment_status_transition", guestReportId, 
        new Error(`Invalid status transition from ${existingReport.payment_status} to paid`));
      throw new Error(`Invalid payment status: expected 'pending', got '${existingReport.payment_status}'`);
    }

    // Extract product_id from database (not Stripe metadata)
    const productId = existingReport.report_data?.product_id;

    if (!productId) {
      logPaymentError("missing_product_id", guestReportId, new Error("Missing product_id in database"));
      throw new Error("Missing product_id in guest_reports.report_data - database corruption");
    }

    logPaymentEvent("payment_processing_started", guestReportId, { 
      product_id: productId,
      promo_code: existingReport.promo_code_used || 'none'
    });

    // Determine if this is an AI report based on price_list.endpoint
    const { isAiReport } = await buildTranslatorPayload(productId, existingReport.report_data, supabase);

    const updateData: any = {
      payment_status: "paid",
      is_ai_report: isAiReport
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

    // STAGE 2: Atomic operation - Update payment status first
    const { data: updatedReport, error: updateErr } = await supabase
      .from("guest_reports")
      .update(updateData)
      .eq("id", guestReportId)
      .eq("payment_status", "pending") // Ensure we only update if still pending (optimistic locking)
      .select()
      .single();

    if (updateErr) {
      logPaymentError("payment_status_update_failed", guestReportId, updateErr);
      throw new Error(`DB update failed: ${updateErr.message}`);
    }

    if (!updatedReport) {
      logPaymentError("concurrent_payment_processing", guestReportId, 
        new Error("No rows updated - possible concurrent processing"));
      throw new Error("Payment may have been processed concurrently");
    }

    logPaymentEvent("payment_status_updated", guestReportId, {
      old_status: "pending",
      new_status: "paid",
      is_ai_report: isAiReport
    });

    // STAGE 2: Atomic promo code increment (only for paid reports)
    await handlePromoCodeIncrement(supabase, existingReport.promo_code_used, guestReportId);

    // Start Swiss processing in background with enhanced retry logic
    EdgeRuntime.waitUntil(
      processSwissDataInBackground(updatedReport.id, updatedReport.report_data, supabase, productId, 3)
    );

    const processingTimeMs = Date.now() - startTime;

    logPaymentEvent("payment_verification_completed", guestReportId, {
      final_status: "paid",
      swiss_processing_started: true,
      processing_time_ms: processingTimeMs,
      stage2_enhanced: true
    });

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData: updatedReport.report_data,
      guestReportId: updatedReport.id,
      swissProcessing: true,
      message: "STAGE 2: Payment verified with enhanced idempotency; Swiss processing started",
      stage2_enhanced: true,
      processing_time_ms: processingTimeMs
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    const processingTimeMs = Date.now() - startTime;
    
    logPaymentError("verification_failed", guestReportId, err, {
      processing_time_ms: processingTimeMs,
      stage: "stage2_enhanced_with_legacy"
    });

    return new Response(JSON.stringify({
      success: false,
      verified: false,
      error: err.message,
      processing_time_ms: processingTimeMs,
      stage2_enhanced: true,
      legacy_compatible: true
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
