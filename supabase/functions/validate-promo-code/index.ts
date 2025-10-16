// testing


import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface ValidatePromoRequest {
  promoCode: string;
  basePrice: number;
  reportType?: string;
}

interface TrustedPricingResponse {
  valid: boolean;
  promo_code_id?: string;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}

// Enhanced logging function
function logValidation(event: string, details: any = {}) {
  console.log(`🎯 [VALIDATE-PROMO] ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}

function logValidationError(event: string, error: any, details: any = {}) {
  console.error(`❌ [VALIDATE-PROMO] ${event}`, {
    timestamp: new Date().toISOString(),
    error: error.message || error,
    ...details
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Read body once and check for warm-up
    const body = await req.json();
    
    // Warm-up check
    if (body?.warm === true) {
      return new Response("Warm-up", { status: 200, headers: corsHeaders });
    }
    
    // Extract data for normal function
    const { promoCode, basePrice, reportType }: ValidatePromoRequest = body;
    
    logValidation("validation_started", {
      promoCode: promoCode?.substring(0, 3) + "***", // Partially mask for logs
      reportType,
    });

    if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) {
      logValidationError("missing_promo_code", new Error("No promo code provided"));
      return new Response(JSON.stringify({ 
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: 0,
        final_price_usd: 0,
        report_type: "",
        reason: "Promo code is required"
      } as TrustedPricingResponse), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!basePrice || typeof basePrice !== 'number' || basePrice <= 0) {
      logValidationError("missing_base_price", new Error("No valid base price provided"));
      return new Response(JSON.stringify({ 
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: 0,
        final_price_usd: 0,
        report_type: "",
        reason: "Base price is required"
      } as TrustedPricingResponse), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine the price identifier (reportType or request)
    const priceIdentifier = reportType;
    if (!priceIdentifier) {
      logValidationError("missing_price_identifier", new Error("No reportType provided"));
      return new Response(JSON.stringify({ 
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: 0,
        final_price_usd: 0,
        report_type: "",
        reason: "Report type is required"
      } as TrustedPricingResponse), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalizedCode = promoCode.trim().toUpperCase();
    
    logValidation("promo_validation_started", { 
      normalized_code: normalizedCode.substring(0, 3) + "***",
      price_identifier: priceIdentifier,
      base_price: basePrice
    });

    // Query the promo_codes table
    const { data: promo, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single();

    if (promoError || !promo) {
      logValidationError("promo_not_found", promoError, { 
        normalized_code: normalizedCode.substring(0, 3) + "***",
        error_code: promoError?.code 
      });
      
      return new Response(JSON.stringify({ 
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: basePrice,
        final_price_usd: basePrice,
        report_type: priceIdentifier,
        reason: "Invalid Promo Code"
      } as TrustedPricingResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check usage limits
    if (promo.max_uses && promo.times_used >= promo.max_uses) {
      logValidationError("usage_limit_exceeded", new Error("Usage limit reached"), { 
        normalized_code: normalizedCode.substring(0, 3) + "***",
        times_used: promo.times_used, 
        max_uses: promo.max_uses 
      });
      
      return new Response(JSON.stringify({ 
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: basePrice,
        final_price_usd: basePrice,
        report_type: priceIdentifier,
        reason: "Usage limit exceeded"
      } as TrustedPricingResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Calculate discount and final price
    const discountPercent = promo.discount_percent || 0;
    const discountAmount = (basePrice * discountPercent) / 100;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    // Round to 2 decimal places
    const roundedDiscount = Math.round(discountAmount * 100) / 100;
    const roundedFinalPrice = Math.round(finalPrice * 100) / 100;

    const processingTimeMs = Date.now() - startTime;

    logValidation("validation_successful", { 
      normalized_code: normalizedCode.substring(0, 3) + "***",
      discount_percent: discountPercent,
      discount_amount: roundedDiscount,
      base_price: basePrice,
      final_price: roundedFinalPrice,
      promo_id: promo.id,
      processing_time_ms: processingTimeMs
    });

    // Return complete trusted pricing object
    return new Response(JSON.stringify({ 
      valid: true,
      promo_code_id: promo.id,
      discount_usd: roundedDiscount,
      trusted_base_price_usd: basePrice,
      final_price_usd: roundedFinalPrice,
      report_type: priceIdentifier
    } as TrustedPricingResponse), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    logValidationError("validation_exception", error, { processing_time_ms: processingTimeMs });
    
    return new Response(JSON.stringify({ 
      valid: false,
      discount_usd: 0,
      trusted_base_price_usd: 0,
      final_price_usd: 0,
      report_type: "",
      reason: "Internal validation error"
    } as TrustedPricingResponse), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
