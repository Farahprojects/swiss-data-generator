// deploy 

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

// DIAGNOSTIC LOGGING - Make it sing!
console.log("🎵 [INITIATE-FLOW] Starting function initialization...");
console.log("🎵 [INITIATE-FLOW] Deno version:", Deno.version);
console.log("🎵 [INITIATE-FLOW] Environment check:", {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? "SET" : "NOT SET",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? "SET" : "NOT SET",
  SITE_URL: Deno.env.get('SITE_URL') || "NOT SET"
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log("🎵 [INITIATE-FLOW] Creating Supabase client...");

let supabaseAdmin;
try {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  console.log("🎵 [INITIATE-FLOW] Supabase client created successfully");
} catch (error) {
  console.error("🎵 [INITIATE-FLOW] ERROR creating Supabase client:", error);
  throw error;
}

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
  console.log("🎵 [INITIATE-FLOW] Request received:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log("🎵 [INITIATE-FLOW] CORS preflight handled");
    return corsResponse;
  }

  const startTime = Date.now();
  console.log("🎵 [INITIATE-FLOW] Starting request processing...");

  try {
    console.log("🎵 [INITIATE-FLOW] Parsing request body...");
    const body = await req.json();
    console.log("🎵 [INITIATE-FLOW] Request body parsed successfully");
    
    // Warm-up check
    if (body?.warm === true) {
      console.log("🎵 [INITIATE-FLOW] Warm-up request handled");
      return new Response("Warm-up", { status: 200, headers: corsHeaders });
    }
    
    const { reportData, trustedPricing }: InitiateReportFlowRequest = body
    
    console.log("🎵 [INITIATE-FLOW] Extracted data:", {
      hasReportData: !!reportData,
      hasTrustedPricing: !!trustedPricing,
      email: reportData?.email
    });

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
    
    // Validate is_ai field is properly set
    if (priceData.is_ai === null || priceData.is_ai === undefined) {
      logFlowError("missing_is_ai_field", new Error("is_ai field not set in price_list"), { 
        price_identifier: priceIdentifier,
        price_data: priceData
      });
      return new Response(JSON.stringify({ 
        error: 'Product configuration error: is_ai field not set' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const isAI = priceData.is_ai;
    
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
    
    // Generate a simple guest hash for identification (optional)
    const guestHash = crypto.randomUUID().substring(0, 16);
    
    logFlowEvent("creating_guest_report", { 
      email: reportData.email,
      guestReportId,
      guestHash
    });
    
    // Normalize report data for translator-edge compatibility
    const smartRequest = (reportData as any).request || reportData.reportType?.split('_')[0] || 'essence';
    const rqLower = String(smartRequest).toLowerCase();

    // Build a normalized report_data payload and keep original fields for backward compatibility
    const normalizedReportData: any = {
      ...reportData,
      request: smartRequest,
      product_id: trustedPricing.report_type,
    };

    // For compatibility/sync reports, ensure person_a and person_b are present
    if (["sync", "compatibility", "synastry"].includes(rqLower)) {
      const personA = {
        birth_date: (reportData as any).birth_date || reportData.birthDate || null,
        birth_time: (reportData as any).birth_time || reportData.birthTime || null,
        location: (reportData as any).location || reportData.birthLocation || "",
        latitude: (reportData as any).latitude ?? reportData.birthLatitude ?? null,
        longitude: (reportData as any).longitude ?? reportData.birthLongitude ?? null,
        tz: (reportData as any).tz || (reportData as any).timezone || "",
        name: (reportData as any).name || "",
        house_system: (reportData as any).house_system || (reportData as any).hsys || "",
      };

      const personB = {
        birth_date: (reportData as any).second_person_birth_date || (reportData as any).secondPersonBirthDate || null,
        birth_time: (reportData as any).second_person_birth_time || (reportData as any).secondPersonBirthTime || null,
        location: (reportData as any).second_person_location || (reportData as any).secondPersonBirthLocation || "",
        latitude: (reportData as any).second_person_latitude ?? (reportData as any).secondPersonLatitude ?? null,
        longitude: (reportData as any).second_person_longitude ?? (reportData as any).secondPersonLongitude ?? null,
        tz: (reportData as any).second_person_tz || (reportData as any).secondPersonTimezone || "",
        name: (reportData as any).second_person_name || (reportData as any).secondPersonName || "",
        house_system: (reportData as any).second_person_house_system || "",
      };

      normalizedReportData.person_a = personA;
      normalizedReportData.person_b = personB;
    }

    logFlowEvent("normalized_report_data_ready", {
      request: smartRequest,
      has_person_a: !!(normalizedReportData as any).person_a,
      has_person_b: !!(normalizedReportData as any).person_b,
      product_id: trustedPricing.report_type,
    });

    const guestReportData = {
      id: guestReportId,
      user_id: null, // No auth.users entry - completely anonymous
      stripe_session_id: guestReportId,
      email: reportData.email, // Store email as plain text
      report_type: reportData.reportType || 'essence_personal',
      amount_paid: expectedFinalPriceRounded,
      report_data: normalizedReportData,
      payment_status: isFreeReport ? "paid" : "pending", // Free reports are immediately paid
      purchase_type: 'report',
      promo_code_used: trustedPricing.promo_code_id || null,
      email_sent: false,
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
      user_id: null, // No user_id for anonymous reports
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
        user_id: null, // Include user_id for frontend auth
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
          successUrl: `${Deno.env.get('SITE_URL') || 'https://theraiastro.com'}/stripe-return?guest_id=${guestReportId}&session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancelUrl: `${Deno.env.get('SITE_URL') || 'https://theraiastro.com'}/stripe-return?guest_id=${guestReportId}&status=cancelled`
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
        user_id: null, // Include user_id for frontend auth
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
