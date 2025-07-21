import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Inline CORS utilities to avoid import issues
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return null;
};

interface ReportData {
  reportType: string
  request?: string
  relationshipType?: string
  essenceType?: string
  reportCategory?: string
  name: string
  email: string
  birthDate: string
  birthTime: string
  birthLocation: string
  birthLatitude?: number
  birthLongitude?: number
  birthPlaceId?: string
  secondPersonName?: string
  secondPersonBirthDate?: string
  secondPersonBirthTime?: string
  secondPersonBirthLocation?: string
  secondPersonLatitude?: number
  secondPersonLongitude?: number
  secondPersonPlaceId?: string
  returnYear?: string
  notes?: string
  priceId?: string
}

interface InitiateReportFlowRequest {
  reportData: ReportData
  promoCode?: string
}

// Extract the exact getProductId logic from frontend usePriceFetch.ts
const getProductId = (data: ReportData): string => {
  // Prioritize direct reportType for unified mobile/desktop behavior
  if (data.reportType) {
    return data.reportType;
  }
  
  // Fallback to request field for astro data
  if (data.request) {
    return data.request;
  }
  
  // Legacy fallback for form combinations (desktop compatibility)
  if (data.essenceType && data.reportCategory === 'the-self') {
    return `essence_${data.essenceType}`;
  }
  
  if (data.relationshipType && data.reportCategory === 'compatibility') {
    return `sync_${data.relationshipType}`;
  }
  
  // If still no priceId, use default fallback
  return 'essence_personal'; // Default fallback
};

// Enhanced logging function for Stage 2
function logFlowEvent(event: string, details: any = {}) {
  console.log(`🔄 [INITIATE-FLOW-V2] ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}

function logFlowError(event: string, error: any, details: any = {}) {
  console.error(`❌ [INITIATE-FLOW-V2] ${event}`, {
    timestamp: new Date().toISOString(),
    error: error.message || error,
    ...details
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  const startTime = Date.now();

  try {
    const { reportData, promoCode }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      promoCode: promoCode || 'none'
    });

    if (!reportData || !reportData.email) {
      logFlowError("missing_required_data", new Error("Missing report data or email"));
      return new Response(JSON.stringify({ 
        error: 'Missing required report data or email' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // --- PRICE LOOKUP FROM DATABASE ---
    
    // Determine priceId using the exact same logic as frontend
    let priceId = reportData.priceId
    if (!priceId) {
      priceId = getProductId(reportData);
    }

    logFlowEvent("price_lookup_started", { priceId, reportType: reportData.reportType });

    // Fetch the base price from the database (SERVER-SIDE)
    const { data: product, error: productError } = await supabaseAdmin
      .from('price_list')
      .select('id, unit_price_usd, name, description')
      .eq('id', priceId)
      .single()

    if (productError || !product) {
      logFlowError("product_lookup_failed", productError, { priceId });
      return new Response(JSON.stringify({ 
        error: 'Product not found or invalid report type',
        debug: { priceId, productError: productError?.message }
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let finalPrice = product.unit_price_usd
    let discountPercent = 0
    let validatedPromoId: string | null = null

    // --- PROMO CODE VALIDATION ---
    
    if (promoCode && promoCode.trim()) {
      logFlowEvent("promo_validation_started", { promoCode });

      const { data: promo, error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (promoError || !promo) {
        logFlowError("promo_validation_failed", promoError, { promoCode });
        return new Response(JSON.stringify({ 
          error: 'Invalid or expired promo code' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check usage limits
      if (promo.max_uses && promo.times_used >= promo.max_uses) {
        logFlowError("promo_limit_reached", new Error("Usage limit reached"), { 
          promoCode, 
          times_used: promo.times_used, 
          max_uses: promo.max_uses 
        });
        return new Response(JSON.stringify({ 
          error: 'This promo code has reached its usage limit' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      validatedPromoId = promo.id
      discountPercent = promo.discount_percent

      logFlowEvent("promo_validated", { 
        promoCode, 
        discount_percent: discountPercent, 
        times_used: promo.times_used,
        max_uses: promo.max_uses 
      });

      // FREE FLOW (100% discount) - STAGE 2: Enhanced free flow with immediate promo increment
      if (discountPercent === 100) {
        const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        logFlowEvent("free_flow_started", { sessionId, promoCode });

        const insertPayload = {
          stripe_session_id: sessionId,
          email: reportData.email,
          report_type: reportData.reportType || 'standard',
          report_data: {
            ...reportData,
            product_id: priceId, // STAGE 1: Store product_id in database
          },
          amount_paid: 0,
          payment_status: 'paid', // Free reports are immediately "paid"
          promo_code_used: promoCode,
          email_sent: false,
          coach_id: null,
          translator_log_id: null,
          report_log_id: null
        }

        const { data: guestReport, error: insertError } = await supabaseAdmin
          .from('guest_reports')
          .insert(insertPayload)
          .select('id')
          .single()

        if (insertError) {
          logFlowError("free_report_insert_failed", insertError, { sessionId });
          return new Response(JSON.stringify({ 
            error: 'Failed to create report record' 
          }), {
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // STAGE 2: For free reports, increment promo code immediately (atomic operation)
        try {
          const { error: promoUpdateError } = await supabaseAdmin
            .from('promo_codes')
            .update({ 
              times_used: promo.times_used + 1 
            })
            .eq('id', validatedPromoId)
            .eq('times_used', promo.times_used) // Optimistic locking

          if (promoUpdateError) {
            logFlowError("free_promo_increment_failed", promoUpdateError, { 
              promoCode, 
              guestReportId: guestReport.id 
            });
            // Continue anyway - report creation succeeded
          } else {
            logFlowEvent("free_promo_incremented", { 
              promoCode, 
              old_usage: promo.times_used, 
              new_usage: promo.times_used + 1,
              guestReportId: guestReport.id
            });
          }
        } catch (promoError) {
          logFlowError("free_promo_increment_exception", promoError, { 
            promoCode, 
            guestReportId: guestReport.id 
          });
          // Continue anyway - report creation succeeded
        }

        // Trigger background generation
        const { error: verifyError } = await supabaseAdmin.functions.invoke(
          'verify-guest-payment',
          { body: { sessionId } }
        )
        
        if (verifyError) {
          logFlowError("free_verification_trigger_failed", verifyError, { sessionId });
        } else {
          logFlowEvent("free_verification_triggered", { sessionId, guestReportId: guestReport.id });
        }

        const processingTimeMs = Date.now() - startTime;

        logFlowEvent("free_flow_completed", { 
          sessionId, 
          guestReportId: guestReport.id,
          processing_time_ms: processingTimeMs
        });

        return new Response(JSON.stringify({ 
          status: 'success', 
          message: 'Your free report is being generated',
          reportId: guestReport.id,
          sessionId,
          isFreeReport: true,
          processing_time_ms: processingTimeMs,
          stage2_enhanced: true
        }), {
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // --- PAID FLOW: STAGE 1 SERVER STATE ARCHITECTURE (Enhanced for Stage 2) ---
    
    const originalAmount = product.unit_price_usd
    const discountAmount = originalAmount * (discountPercent / 100)
    const finalAmount = Math.max(originalAmount - discountAmount, 1) // Ensure minimum $1

    logFlowEvent("pricing_calculated", {
      original: originalAmount,
      discount: discountPercent,
      final: finalAmount,
      priceId,
      promoCode: promoCode || 'none'
    });

    // STAGE 1: Create guest_reports row IMMEDIATELY with pending status
    const guestReportData = {
      stripe_session_id: `temp_${Date.now()}`, // Temporary ID, will be updated after Stripe session creation
      email: reportData.email,
      report_type: reportData.reportType || null,
      amount_paid: finalAmount,
      report_data: {
        ...reportData,
        product_id: priceId, // Store product_id in database
      },
      payment_status: "pending", // STAGE 2: Explicit pending status for paid reports
      purchase_type: 'report',
      promo_code_used: promoCode || null,
    };

    logFlowEvent("guest_report_creation_started", {
      email: reportData.email,
      amount: finalAmount,
      product_id: priceId,
      promoCode: promoCode || 'none'
    });

    // Create the guest_reports row first
    const { data: guestReport, error: insertError } = await supabaseAdmin
      .from("guest_reports")
      .insert(guestReportData)
      .select()
      .single();

    if (insertError) {
      logFlowError("guest_report_creation_failed", insertError, { email: reportData.email });
      return new Response(JSON.stringify({ 
        error: `Database error: ${insertError.message}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logFlowEvent("guest_report_created", { guestReportId: guestReport.id });

    // Now create checkout session with minimal data - UPDATED CANCEL URL TOO
    const checkoutData = {
      guest_report_id: guestReport.id,
      amount: finalAmount,
      email: reportData.email,
      description: product.description || `${product.name} Report`,
      successUrl: `${req.headers.get("origin")}/report?guest_id=${guestReport.id}`,
      cancelUrl: `${req.headers.get("origin")}/report?status=cancelled`,
    };

    logFlowEvent("checkout_creation_started", {
      guest_report_id: guestReport.id,
      amount: finalAmount,
      email: reportData.email
    });

    const { data: stripeResult, error: checkoutError } = await supabaseAdmin.functions.invoke(
      'create-checkout',
      { body: checkoutData }
    );

    if (checkoutError) {
      logFlowError("checkout_creation_failed", checkoutError, { guestReportId: guestReport.id });
      // Clean up the guest_reports row if checkout fails
      await supabaseAdmin
        .from("guest_reports")
        .delete()
        .eq("id", guestReport.id);
      return new Response(JSON.stringify({ 
        error: `Failed to create checkout: ${checkoutError.message}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!stripeResult?.url) {
      logFlowError("no_checkout_url", new Error("No URL returned"), { guestReportId: guestReport.id });
      await supabaseAdmin
        .from("guest_reports")
        .delete()
        .eq("id", guestReport.id);
      return new Response(JSON.stringify({ 
        error: 'No checkout URL returned from create-checkout' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the guest_reports row with the real Stripe session ID
    await supabaseAdmin
      .from("guest_reports")
      .update({ stripe_session_id: stripeResult.sessionId })
      .eq("id", guestReport.id);

    const processingTimeMs = Date.now() - startTime;

    logFlowEvent("paid_flow_completed", {
      guestReportId: guestReport.id,
      sessionId: stripeResult.sessionId,
      finalAmount,
      processing_time_ms: processingTimeMs
    });

    // STAGE 2: Enhanced response with comprehensive data
    return new Response(JSON.stringify({
      status: 'payment_required',
      stripeUrl: stripeResult.url,
      sessionId: stripeResult.sessionId,
      guest_report_id: guestReport.id,
      finalAmount: finalAmount,
      description: checkoutData.description,
      processing_time_ms: processingTimeMs,
      stage2_enhanced: true,
      debug: {
        originalPrice: originalAmount,
        discountApplied: discountPercent,
        product_id: priceId,
        guest_reports_created: true,
        promoCodeUsed: promoCode || 'none',
        promo_will_increment_after_payment: !!promoCode && discountPercent < 100
      }
    }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    const processingTimeMs = Date.now() - startTime;
    logFlowError("flow_exception", err, { processing_time_ms: processingTimeMs });
    
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal server error',
      processing_time_ms: processingTimeMs,
      stage2_enhanced: true
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
