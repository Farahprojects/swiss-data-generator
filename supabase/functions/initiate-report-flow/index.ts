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
  basePrice: number
  promoCode?: string
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
    const { reportData, basePrice, promoCode }: InitiateReportFlowRequest = await req.json()
    
    logFlowEvent("flow_started", {
      email: reportData?.email,
      reportType: reportData?.reportType,
      basePrice,
      promoCode: promoCode ? promoCode.substring(0, 3) + "***" : 'none'
    });

    if (!reportData?.email || !basePrice) {
      logFlowError("missing_required_data", new Error("Missing email or basePrice"));
      return new Response(JSON.stringify({ 
        error: 'Missing required report data, email, or basePrice' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // OPTIMIZATION: Trust frontend basePrice calculation (no DB lookup)
    let finalPrice = basePrice;
    let discountPercent = 0;
    let isFreeReport = false;

    // Inline promo validation (if provided)
    if (promoCode && promoCode.trim()) {
      logFlowEvent("promo_validation_started", { 
        promoCode: promoCode.substring(0, 3) + "***",
        basePrice 
      });

      const { data: promoData, error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promoError || !promoData) {
        logFlowError("promo_invalid", new Error("Invalid promo code"), { 
          promoCode: promoCode.substring(0, 3) + "***" 
        });
        return new Response(JSON.stringify({ 
          error: 'Invalid or expired promo code' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check usage limits
      if (promoData.max_uses && promoData.times_used >= promoData.max_uses) {
        return new Response(JSON.stringify({ 
          error: 'Promo code has reached maximum usage limit' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Apply discount
      discountPercent = promoData.discount_percent;
      isFreeReport = discountPercent === 100;
      
      if (isFreeReport) {
        finalPrice = 0;
      } else {
        const discountAmount = basePrice * (discountPercent / 100);
        finalPrice = Math.max(basePrice - discountAmount, 0);
      }

      logFlowEvent("promo_validated", { 
        promoCode: promoCode.substring(0, 3) + "***",
        discount_percent: discountPercent,
        isFreeReport,
        finalPrice
      });
    }

    // OPTIMIZATION: Single database operation with UUID as both id and stripe_session_id
    const guestReportId = crypto.randomUUID();
    
    const guestReportData = {
      id: guestReportId,
      stripe_session_id: guestReportId, // Use same UUID for both
      email: reportData.email,
      report_type: reportData.reportType || 'essence_personal',
      amount_paid: finalPrice,
      report_data: reportData,
      payment_status: "pending",
      purchase_type: 'report',
      promo_code_used: promoCode || null,
      email_sent: false,
      coach_id: null,
      translator_log_id: null,
      report_log_id: null
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
      finalPrice,
      processing_time_ms: processingTimeMs
    });

    // Return minimal response for frontend orchestration
    return new Response(JSON.stringify({ 
      guestReportId,
      basePrice,
      finalPrice,
      isFreeReport,
      discountPercent,
      processing_time_ms: processingTimeMs
    }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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
