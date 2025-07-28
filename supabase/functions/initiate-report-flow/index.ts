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

interface ValidatedPromo {
  valid: boolean
  discount_type?: "percentage" | "fixed" | "free"
  discount_value?: number
  isFreeReport?: boolean
  code?: string
  promo_id?: string
}

interface InitiateReportFlowRequest {
  reportData: ReportData
  basePrice?: number
  validatedPromo?: ValidatedPromo
}

// Removed duplicate getProductId logic - trusting frontend pricing

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
    const { reportData, basePrice: frontendPrice, validatedPromo }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      frontendPrice,
      validatedPromo: validatedPromo ? { discount_type: validatedPromo.discount_type, discount_value: validatedPromo.discount_value } : 'none'
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

    // --- SIMPLIFIED PRICING: Trust frontend calculation ---
    
    // Validate frontend price: allow 0 for free reports but require promo authorization
    if (frontendPrice === null || frontendPrice === undefined || frontendPrice < 0) {
      logFlowError("invalid_frontend_price", new Error("Price must be provided and non-negative"));
      return new Response(JSON.stringify({ 
        error: 'Invalid pricing data - price must be non-negative' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If price is 0, ensure it's authorized by a free promo
    if (frontendPrice === 0 && !validatedPromo?.isFreeReport) {
      logFlowError("unauthorized_free_report", new Error("Free reports require valid promo authorization"));
      return new Response(JSON.stringify({ 
        error: 'Free reports require valid promotional code authorization' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Frontend already calculated final price including promo discount
    const finalPrice = frontendPrice;
    const priceId = reportData.priceId || reportData.reportType || 'standard';
    
    logFlowEvent("price_trusted_from_frontend", { 
      finalPrice, 
      priceId,
      validatedPromo: validatedPromo ? { discount_type: validatedPromo.discount_type, discount_value: validatedPromo.discount_value } : null,
      optimization: "promo_validation_eliminated"
    });

    // Extract promo information from pre-validated data
    let discountPercent = 0;
    let validatedPromoId: string | null = null;
    let promoCode: string | null = null;

    if (validatedPromo?.valid) {
      validatedPromoId = validatedPromo.promo_id || null;
      discountPercent = validatedPromo.discount_value || 0;
      promoCode = validatedPromo.code || null;

      logFlowEvent("promo_data_extracted", { 
        promoCode: promoCode?.substring(0, 3) + "***", 
        discount_percent: discountPercent,
        discount_type: validatedPromo.discount_type
      });

        // FREE FLOW - If promo explicitly authorizes free report
        if (validatedPromo.isFreeReport) {
          const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

          logFlowEvent("free_flow_started", { sessionId, promoCode });

          const insertPayload = {
            stripe_session_id: sessionId,
            email: reportData.email,
            report_type: reportData.reportType || 'standard',
            report_data: {
              ...reportData,
              product_id: priceId,
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

          // Increment promo code usage immediately (atomic operation)
          if (validatedPromoId) {
            try {
              const { error: promoUpdateError } = await supabaseAdmin
                .from('promo_codes')
                .update({ 
                  times_used: supabaseAdmin.raw('times_used + 1')
                })
                .eq('id', validatedPromoId);

              if (promoUpdateError) {
                logFlowError("free_promo_increment_failed", promoUpdateError, { 
                  promoCode: promoCode?.substring(0, 3) + "***", 
                  guestReportId: guestReport.id 
                });
              } else {
                logFlowEvent("free_promo_incremented", { 
                  promoCode: promoCode?.substring(0, 3) + "***",
                  guestReportId: guestReport.id
                });
              }
            } catch (promoError) {
              logFlowError("free_promo_increment_exception", promoError, { 
                promoCode: promoCode?.substring(0, 3) + "***", 
                guestReportId: guestReport.id 
              });
            }
          }

          const processingTimeMs = Date.now() - startTime;

          logFlowEvent("free_flow_completed", { 
            sessionId, 
            guestReportId: guestReport.id,
            processing_time_ms: processingTimeMs,
            background_processing_removed: true,
            note: "Processing will be triggered by validate-promo-code"
          });

          return new Response(JSON.stringify({ 
            success: true,
            status: 'success', 
            message: 'Your free report is being generated',
            guestReportId: guestReport.id,
            reportId: guestReport.id,
            sessionId,
            isFreeReport: true,
            processing_time_ms: processingTimeMs
          }), {
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
    }

    // --- PAID FLOW: Create guest_reports row IMMEDIATELY with pending status ---
    
    // Frontend already calculated the final amount including discount
    const finalAmount = Math.max(finalPrice, 1); // Ensure minimum $1

    logFlowEvent("pricing_calculated", {
      final: finalAmount,
      priceId,
      promoCode: promoCode?.substring(0, 3) + "***" || 'none',
      optimization: "frontend_calculated_with_validated_promo"
    });

    // Create guest_reports row IMMEDIATELY with pending status
    const guestReportData = {
      stripe_session_id: `temp_${Date.now()}`, // Temporary ID, will be updated after Stripe session creation
      email: reportData.email,
      report_type: reportData.reportType || null,
      amount_paid: finalAmount,
      report_data: {
        ...reportData,
        product_id: priceId,
      },
      payment_status: "pending",
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

    // Now create checkout session with minimal data
    const checkoutData = {
      guest_report_id: guestReport.id,
      amount: finalAmount,
      email: reportData.email,
      description: "Astrology Report",
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

    return new Response(JSON.stringify({
      status: 'payment_required',
      stripeUrl: stripeResult.url,
      sessionId: stripeResult.sessionId,
      guest_report_id: guestReport.id,
      finalAmount: finalAmount,
      description: checkoutData.description,
      processing_time_ms: processingTimeMs,
      debug: {
        finalAmount: finalAmount,
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
      processing_time_ms: processingTimeMs
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
