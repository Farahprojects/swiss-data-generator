import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
  promo_code: string;
  email?: string; // Optional for future user-level restrictions
  // For free report orchestration
  reportData?: any;
  guestReportId?: string;
}

interface ValidatePromoResponse {
  valid: boolean;
  discount_type?: "percentage" | "fixed" | "free";
  discount_value?: number;
  code?: string;
  promo_id?: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { promo_code, email, reportData, guestReportId }: ValidatePromoRequest = await req.json();
    
    logValidation("validation_started", {
      promo_code: promo_code?.substring(0, 3) + "***", // Partially mask for logs
      email: email || "not_provided"
    });

    if (!promo_code || typeof promo_code !== 'string' || !promo_code.trim()) {
      logValidationError("missing_promo_code", new Error("No promo code provided"));
      return new Response(JSON.stringify({ 
        valid: false,
        reason: "Promo code is required"
      } as ValidatePromoResponse), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalizedCode = promo_code.trim().toUpperCase();
    
    logValidation("database_lookup_started", { normalized_code: normalizedCode.substring(0, 3) + "***" });

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
        reason: "Code not found or inactive"
      } as ValidatePromoResponse), {
        status: 200, // Return 200 with valid: false for client handling
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
        reason: "Usage limit exceeded"
      } as ValidatePromoResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine discount type based on discount_percent
    let discount_type: "percentage" | "fixed" | "free";
    if (promo.discount_percent === 100) {
      discount_type = "free";
    } else if (promo.discount_percent > 0) {
      discount_type = "percentage";
    } else {
      // Future: could support fixed amount discounts
      discount_type = "percentage";
    }

    const processingTimeMs = Date.now() - startTime;

    logValidation("validation_successful", { 
      normalized_code: normalizedCode.substring(0, 3) + "***",
      discount_type,
      discount_value: promo.discount_percent,
      times_used: promo.times_used,
      max_uses: promo.max_uses,
      processing_time_ms: processingTimeMs
    });

    // FREE REPORT ORCHESTRATION: If this is a free promo and we have a guestReportId, trigger processing
    if (discount_type === "free" && guestReportId) {
      logValidation("free_report_orchestration_started", {
        normalized_code: normalizedCode.substring(0, 3) + "***",
        guestReportId
      });

      try {
        const { error: verifyError } = await supabaseAdmin.functions.invoke(
          'verify-guest-payment',
          { 
            body: { 
              sessionId: guestReportId, // Use guestReportId as sessionId for free reports
              backgroundRequestId: crypto.randomUUID().slice(0, 8),
              orchestrated_by: 'validate-promo-code'
            } 
          }
        );

        if (verifyError) {
          logValidationError("free_report_processing_failed", verifyError, {
            normalized_code: normalizedCode.substring(0, 3) + "***",
            guestReportId
          });
          
          // Still return successful validation but note the processing failure
          return new Response(JSON.stringify({ 
            valid: true,
            discount_type,
            discount_value: promo.discount_percent,
            code: normalizedCode,
            promo_id: promo.id,
            processing_triggered: false,
            processing_error: "Failed to trigger report generation"
          } as ValidatePromoResponse), {
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logValidation("free_report_processing_triggered", {
          normalized_code: normalizedCode.substring(0, 3) + "***",
          guestReportId
        });

        // Return successful validation with processing triggered
        return new Response(JSON.stringify({ 
          valid: true,
          discount_type,
          discount_value: promo.discount_percent,
          code: normalizedCode,
          promo_id: promo.id,
          processing_triggered: true
        } as ValidatePromoResponse), {
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (orchestrationError) {
        logValidationError("free_report_orchestration_exception", orchestrationError, {
          normalized_code: normalizedCode.substring(0, 3) + "***",
          guestReportId
        });

        // Still return successful validation but note the orchestration failure
        return new Response(JSON.stringify({ 
          valid: true,
          discount_type,
          discount_value: promo.discount_percent,
          code: normalizedCode,
          promo_id: promo.id,
          processing_triggered: false,
          processing_error: "Exception during report generation"
        } as ValidatePromoResponse), {
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Return successful validation (standard flow - no orchestration needed)
    return new Response(JSON.stringify({ 
      valid: true,
      discount_type,
      discount_value: promo.discount_percent,
      code: normalizedCode,
      promo_id: promo.id
    } as ValidatePromoResponse), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    logValidationError("validation_exception", error, { processing_time_ms: processingTimeMs });
    
    return new Response(JSON.stringify({ 
      valid: false,
      reason: "Internal validation error"
    } as ValidatePromoResponse), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});