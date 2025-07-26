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
  basePrice?: number
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
    const { reportData, basePrice: frontendPrice, promoCode }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      frontendPrice,
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

    // --- OPTIMIZED PRICING: Use frontend price instead of database lookup ---
    
    let priceId: string;
    let basePrice: number;
    let productName = "Report";
    let productDescription = "Astrology Report";

    if (frontendPrice && frontendPrice > 0) {
      // Basic validation that the price is reasonable (between $1 and $500)
      if (frontendPrice < 1 || frontendPrice > 500) {
        logFlowError("invalid_frontend_price", new Error("Price outside acceptable range"), { frontendPrice });
        return new Response(JSON.stringify({ 
          error: 'Invalid pricing data' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      basePrice = frontendPrice;
      priceId = reportData.priceId || getProductId(reportData);
      
      logFlowEvent("price_from_frontend", { 
        basePrice, 
        priceId,
        optimization: "database_lookup_skipped"
      });
    } else {
      // Fallback to database lookup if no frontend price provided (shouldn't happen in normal flow)
      priceId = reportData.priceId || getProductId(reportData);
      
      logFlowEvent("price_fallback_lookup", { priceId, reportType: reportData.reportType });

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

      basePrice = product.unit_price_usd;
      productName = product.name;
      productDescription = product.description;
      
      logFlowEvent("price_from_database_fallback", { basePrice, priceId });
    }

    let finalPrice = basePrice
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

      // FREE FLOW (100% discount) - Return success immediately, trigger processing in background
      if (discountPercent === 100) {
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
        }

        // BACKGROUND PROCESSING: Trigger verify-guest-payment asynchronously
        const backgroundProcessingStart = Date.now();
        const backgroundRequestId = crypto.randomUUID().slice(0, 8);
        
        logFlowEvent("edgeruntime_waituntil_check", {
          sessionId,
          guestReportId: guestReport.id,
          backgroundRequestId,
          EdgeRuntime_available: typeof EdgeRuntime !== 'undefined',
          waitUntil_available: typeof EdgeRuntime?.waitUntil === 'function'
        });

        if (typeof EdgeRuntime?.waitUntil === 'function') {
          logFlowEvent("edgeruntime_waituntil_starting", {
            sessionId,
            guestReportId: guestReport.id,
            backgroundRequestId,
            timestamp: new Date().toISOString()
          });

          EdgeRuntime.waitUntil(
            (async () => {
              const asyncStartTime = Date.now();
              const delayFromTrigger = asyncStartTime - backgroundProcessingStart;
              
              try {
                logFlowEvent("background_processing_started", { 
                  sessionId, 
                  guestReportId: guestReport.id,
                  backgroundRequestId,
                  delay_from_trigger_ms: delayFromTrigger,
                  async_start_timestamp: new Date().toISOString()
                });

                const invokeStartTime = Date.now();
                const { error: verifyError } = await supabaseAdmin.functions.invoke(
                  'verify-guest-payment',
                  { body: { sessionId, backgroundRequestId } }
                );
                const invokeDuration = Date.now() - invokeStartTime;
                
                if (verifyError) {
                  logFlowError("background_verification_failed", verifyError, { 
                    sessionId, 
                    guestReportId: guestReport.id,
                    backgroundRequestId,
                    invoke_duration_ms: invokeDuration
                  });
                } else {
                  logFlowEvent("background_verification_completed", { 
                    sessionId, 
                    guestReportId: guestReport.id,
                    backgroundRequestId,
                    invoke_duration_ms: invokeDuration,
                    total_async_duration_ms: Date.now() - asyncStartTime
                  });
                }
              } catch (bgError) {
                logFlowError("background_processing_exception", bgError, { 
                  sessionId, 
                  guestReportId: guestReport.id,
                  backgroundRequestId,
                  delay_from_trigger_ms: delayFromTrigger
                });
              }
            })()
          );

          logFlowEvent("edgeruntime_waituntil_registered", {
            sessionId,
            guestReportId: guestReport.id,
            backgroundRequestId,
            registration_duration_ms: Date.now() - backgroundProcessingStart
          });
        } else {
          logFlowError("edgeruntime_waituntil_unavailable", new Error("EdgeRuntime.waitUntil not available"), {
            sessionId,
            guestReportId: guestReport.id,
            backgroundRequestId,
            fallback_to_sync: true
          });
          
          // Fallback: Direct invocation (for debugging)
          try {
            const { error: verifyError } = await supabaseAdmin.functions.invoke(
              'verify-guest-payment',
              { body: { sessionId, backgroundRequestId, fallback_sync: true } }
            );
            
            if (verifyError) {
              logFlowError("sync_fallback_verification_failed", verifyError, { 
                sessionId, 
                guestReportId: guestReport.id,
                backgroundRequestId
              });
            } else {
              logFlowEvent("sync_fallback_verification_completed", { 
                sessionId, 
                guestReportId: guestReport.id,
                backgroundRequestId
              });
            }
          } catch (fallbackError) {
            logFlowError("sync_fallback_exception", fallbackError, { 
              sessionId, 
              guestReportId: guestReport.id,
              backgroundRequestId
            });
          }
        }

        const processingTimeMs = Date.now() - startTime;

        logFlowEvent("free_flow_completed", { 
          sessionId, 
          guestReportId: guestReport.id,
          processing_time_ms: processingTimeMs,
          background_processing_triggered: true
        });

        return new Response(JSON.stringify({ 
          status: 'success', 
          message: 'Your free report is being generated',
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
    
    const originalAmount = basePrice
    const discountAmount = originalAmount * (discountPercent / 100)
    const finalAmount = Math.max(originalAmount - discountAmount, 1) // Ensure minimum $1

    logFlowEvent("pricing_calculated", {
      original: originalAmount,
      discount: discountPercent,
      final: finalAmount,
      priceId,
      promoCode: promoCode || 'none',
      optimization: frontendPrice ? "used_frontend_price" : "used_database_fallback"
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
      description: productDescription || `${productName} Report`,
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
      processing_time_ms: processingTimeMs
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
