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
  promoCode?: string
  validatedPromo?: ValidatedPromo // Legacy support
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
    const { reportData, basePrice: frontendPrice, promoCode: rawPromoCode, validatedPromo }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      frontendPrice,
      promoCode: rawPromoCode ? rawPromoCode.substring(0, 3) + "***" : 'none',
      legacy_validatedPromo: validatedPromo ? { discount_type: validatedPromo.discount_type, discount_value: validatedPromo.discount_value } : 'none'
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

    // --- NEW APPROACH: Validate promo code directly if provided ---
    
    let finalPrice = frontendPrice || 0;
    let promoCode: string | null = rawPromoCode || null;
    let discountPercent = 0;
    let isFreeReport = false;

    // If promo code provided, validate it
    if (promoCode && promoCode.trim()) {
      logFlowEvent("promo_validation_started", { 
        promoCode: promoCode.substring(0, 3) + "***",
        basePrice: frontendPrice 
      });

      try {
        const { data: promoResponse, error: promoError } = await supabaseAdmin.functions.invoke(
          'validate-promo-code', 
          {
            body: {
              promo_code: promoCode,
              email: reportData.email
            }
          }
        );

        if (promoError) {
          logFlowError("promo_validation_failed", promoError, { promoCode: promoCode.substring(0, 3) + "***" });
          return new Response(JSON.stringify({ 
            error: 'Promo code validation failed' 
          }), {
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!promoResponse.valid) {
          logFlowError("promo_invalid", new Error(promoResponse.reason || "Invalid promo code"), { 
            promoCode: promoCode.substring(0, 3) + "***" 
          });
          return new Response(JSON.stringify({ 
            error: promoResponse.reason || 'Invalid promo code' 
          }), {
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Apply discount
        discountPercent = promoResponse.discount_value || 0;
        isFreeReport = promoResponse.isFreeReport || false;
        
        if (isFreeReport) {
          finalPrice = 0;
        } else {
          const discountAmount = frontendPrice * (discountPercent / 100);
          finalPrice = Math.max(frontendPrice - discountAmount, 0);
        }

        logFlowEvent("promo_validated", { 
          promoCode: promoCode.substring(0, 3) + "***",
          discount_percent: discountPercent,
          discount_type: promoResponse.discount_type,
          isFreeReport,
          finalPrice
        });

      } catch (promoException) {
        logFlowError("promo_validation_exception", promoException, { 
          promoCode: promoCode.substring(0, 3) + "***" 
        });
        return new Response(JSON.stringify({ 
          error: 'Promo validation error' 
        }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const priceId = reportData.priceId || reportData.reportType || 'standard';
    
    logFlowEvent("pricing_determined", { 
      finalPrice, 
      priceId,
      promoCode: promoCode ? promoCode.substring(0, 3) + "***" : 'none',
      isFreeReport,
      discountPercent
    });

    // FREE FLOW - If promo code makes report free
    if (isFreeReport) {
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

          // Trigger orchestration by calling validate-promo-code with guestReportId
          // This will invoke verify-guest-payment to start the report generation process
          try {
            logFlowEvent("orchestration_trigger_started", { guestReportId: guestReport.id, promoCode: promoCode?.substring(0, 3) + "***" });
            
            const { data: orchestrationResult, error: orchestrationError } = await supabaseAdmin.functions.invoke(
              'validate-promo-code', 
              {
                body: {
                  promo_code: promoCode,
                  email: reportData.email,
                  guestReportId: guestReport.id
                }
              }
            );

            if (orchestrationError) {
              logFlowError("orchestration_trigger_failed", orchestrationError, { 
                guestReportId: guestReport.id, 
                promoCode: promoCode?.substring(0, 3) + "***" 
              });
              // Continue anyway - the report record exists, user can still access it
            } else {
              logFlowEvent("orchestration_trigger_success", { 
                guestReportId: guestReport.id, 
                orchestrationResult: orchestrationResult ? "triggered" : "no_result" 
              });
            }
          } catch (orchestrationException) {
            logFlowError("orchestration_trigger_exception", orchestrationException, { 
              guestReportId: guestReport.id, 
              promoCode: promoCode?.substring(0, 3) + "***" 
            });
            // Continue anyway - the report record exists, user can still access it
          }

          const processingTimeMs = Date.now() - startTime;

          logFlowEvent("free_flow_completed", { 
            sessionId, 
            guestReportId: guestReport.id,
            processing_time_ms: processingTimeMs,
            orchestration_triggered: true,
            note: "verify-guest-payment triggered via validate-promo-code orchestration"
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
