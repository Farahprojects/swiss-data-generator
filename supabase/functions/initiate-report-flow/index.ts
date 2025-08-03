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
  isAstroOnly?: boolean
}

interface TrustedPricing {
  valid: boolean
  promo_code_id?: string
  discount_usd: number
  trusted_base_price_usd: number
  final_price_usd: number
  report_type: string
  reason?: string
}

interface InitiateReportFlowRequest {
  reportData: ReportData
  trustedPricing: TrustedPricing
}

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
    const { reportData, trustedPricing }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      trustedPricing: {
        valid: trustedPricing?.valid,
        final_price: trustedPricing?.final_price_usd,
        base_price: trustedPricing?.trusted_base_price_usd,
        discount: trustedPricing?.discount_usd,
        report_type: trustedPricing?.report_type
      }
    });

    if (!reportData?.email || !trustedPricing) {
      logFlowError("missing_required_data", new Error("Missing email or trustedPricing"));
      return new Response(JSON.stringify({ 
        error: 'Missing required report data or trusted pricing' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 1: Re-validate base price from price_list
    const priceIdentifier = trustedPricing.report_type;
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from('price_list')
      .select('id, unit_price_usd, is_ai')
      .eq('id', priceIdentifier)
      .single();

    if (priceError || !priceData) {
      logFlowError("price_validation_failed", priceError, { 
        price_identifier: priceIdentifier,
        error_code: priceError?.code 
      });
      return new Response(JSON.stringify({ 
        error: 'Price validation failed' 
      }), {
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validatedBasePrice = Number(priceData.unit_price_usd);
    const isAI = priceData.is_ai || false;
    
    // Step 2: Re-validate promo code if present
    let validatedDiscount = 0;
    if (trustedPricing.promo_code_id) {
      const { data: promoData, error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .select('discount_percent')
        .eq('id', trustedPricing.promo_code_id)
        .eq('is_active', true)
        .single();

      if (promoError || !promoData) {
        logFlowError("promo_validation_failed", promoError, { 
          promo_code_id: trustedPricing.promo_code_id 
        });
        return new Response(JSON.stringify({ 
          error: 'Promo code validation failed' 
        }), {
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const discountPercent = promoData.discount_percent || 0;
      validatedDiscount = (validatedBasePrice * discountPercent) / 100;
      validatedDiscount = Math.round(validatedDiscount * 100) / 100; // Round to 2 decimal places
    }

    // Step 3: Calculate expected final price and validate against trusted pricing
    const expectedFinalPrice = Math.max(0, validatedBasePrice - validatedDiscount);
    const expectedFinalPriceRounded = Math.round(expectedFinalPrice * 100) / 100;

    if (expectedFinalPriceRounded !== trustedPricing.final_price_usd) {
      logFlowError("pricing_mismatch_detected", new Error("Final price mismatch"), {
        expected: expectedFinalPriceRounded,
        received: trustedPricing.final_price_usd,
        base_price: validatedBasePrice,
        discount: validatedDiscount
      });
      return new Response(JSON.stringify({ 
        error: 'Pricing mismatch detected' 
      }), {
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 4: Determine if this is a free report
    const isFreeReport = expectedFinalPriceRounded === 0;
    
    logFlowEvent("pricing_validated", {
      base_price: validatedBasePrice,
      discount: validatedDiscount,
      final_price: expectedFinalPriceRounded,
      is_free: isFreeReport,
      promo_code_id: trustedPricing.promo_code_id
    });

    // OPTIMIZATION: Single database operation with UUID as both id and stripe_session_id
    const guestReportId = crypto.randomUUID();
    
    const guestReportData = {
      id: guestReportId,
      stripe_session_id: guestReportId,
      email: reportData.email,
      report_type: reportData.reportType || 'essence_personal',
      amount_paid: expectedFinalPriceRounded,
      report_data: reportData,
      payment_status: isFreeReport ? "paid" : "pending", // Free reports are immediately paid
      purchase_type: 'report',
      promo_code_used: trustedPricing.promo_code_id || null,
      email_sent: false,
      coach_id: null,
      translator_log_id: null,
      report_log_id: null,
      is_ai_report: isAI
    };

    const { error: insertError } = await supabaseAdmin
      .from("guest_reports")
      .insert(guestReportData);

    if (insertError) {
      logFlowError("guest_report_creation_failed", insertError, { email: reportData.email });
      return new Response(JSON.stringify({ 
        error: 'Failed to create report record' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const processingTimeMs = Date.now() - startTime;

    logFlowEvent("flow_completed", { 
      guestReportId,
      isFreeReport,
      finalPrice: expectedFinalPriceRounded,
      processing_time_ms: processingTimeMs
    });

    // Handle free reports - process immediately
    if (isFreeReport) {
      // Fire and forget - don't wait for completion
      supabaseAdmin.functions.invoke('verify-guest-payment', {
        body: {
          sessionId: guestReportId,
          type: 'promo',
          requestId: crypto.randomUUID().substring(0, 8)
        }
      }).catch(error => {
        console.log(`⚠️ Failed to trigger verify-guest-payment: ${error.message}`);
      });

      return new Response(JSON.stringify({ 
        guestReportId,
        finalPrice: expectedFinalPriceRounded,
        isFreeReport: true,
        processing_time_ms: processingTimeMs
      }), {
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle paid reports - create checkout session
    try {
      const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('create-checkout', {
        body: {
          guest_report_id: guestReportId,
          amount: expectedFinalPriceRounded,
          email: reportData.email,
          description: "Astrology Report",
          successUrl: `${Deno.env.get('SITE_URL') || 'https://therai.com'}/report?guest_id=${guestReportId}`,
          cancelUrl: `${Deno.env.get('SITE_URL') || 'https://therai.com'}/checkout/${guestReportId}?status=cancelled`
        }
      });

      if (checkoutError || !checkoutData?.url) {
        logFlowError("checkout_creation_failed", checkoutError, { guestReportId, finalPrice: expectedFinalPriceRounded });
        return new Response(JSON.stringify({ 
          error: 'Failed to create checkout session' 
        }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        guestReportId,
        finalPrice: expectedFinalPriceRounded,
        isFreeReport: false,
        checkoutUrl: checkoutData.url,
        processing_time_ms: processingTimeMs
      }), {
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (checkoutErr: any) {
      logFlowError("checkout_exception", checkoutErr, { guestReportId, finalPrice: expectedFinalPriceRounded });
      return new Response(JSON.stringify({ 
        error: 'Failed to create checkout session' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
