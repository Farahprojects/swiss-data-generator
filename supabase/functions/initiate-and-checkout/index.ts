import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("🔄 [INITIATE-AND-CHECKOUT] Starting orchestrated flow...");
    
    const payload = await req.json();
    console.log("🔄 [INITIATE-AND-CHECKOUT] Received payload:", {
      hasReportData: !!payload.reportData,
      hasTrustedPricing: !!payload.trustedPricing,
      email: payload.reportData?.email
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Step 1: Call initiate-report-flow
    console.log("🔄 [INITIATE-AND-CHECKOUT] Step 1: Calling initiate-report-flow...");
    const { data: initiateResponse, error: initiateError } = await supabase.functions.invoke('initiate-report-flow', {
      body: payload
    });

    if (initiateError || !initiateResponse?.guestReportId) {
      console.error("❌ [INITIATE-AND-CHECKOUT] Failed to initiate report:", initiateError);
      throw new Error('Failed to initiate report: ' + (initiateError?.message || 'Unknown error'));
    }

    console.log("✅ [INITIATE-AND-CHECKOUT] Report initiated successfully:", {
      guestReportId: initiateResponse.guestReportId,
      isFreeReport: initiateResponse.isFreeReport,
      hasCheckoutUrl: !!initiateResponse.checkoutUrl
    });

    // If it's a free report, return early
    if (initiateResponse.isFreeReport) {
      return new Response(JSON.stringify({
        success: true,
        guestReportId: initiateResponse.guestReportId,
        isFreeReport: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // If checkout URL is already provided, return it
    if (initiateResponse.checkoutUrl) {
      console.log("✅ [INITIATE-AND-CHECKOUT] Checkout URL already provided by initiate-report-flow");
      return new Response(JSON.stringify({
        success: true,
        guestReportId: initiateResponse.guestReportId,
        checkoutUrl: initiateResponse.checkoutUrl
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Step 2: Create checkout session if not provided
    console.log("🔄 [INITIATE-AND-CHECKOUT] Step 2: Creating checkout session...");
    const origin = req.headers.get("origin") || "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
    
    const { data: checkoutResponse, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
      body: {
        guest_report_id: initiateResponse.guestReportId,
        amount: payload.trustedPricing.final_price_usd,
        email: payload.reportData.email,
        description: "Astrology Report",
        successUrl: `${origin}/report?guest_id=${initiateResponse.guestReportId}`,
        cancelUrl: `${origin}/checkout/${initiateResponse.guestReportId}?status=cancelled`
      }
    });

    if (checkoutError || !checkoutResponse?.url) {
      console.error("❌ [INITIATE-AND-CHECKOUT] Failed to create checkout:", checkoutError);
      throw new Error('Failed to create checkout session: ' + (checkoutError?.message || 'Unknown error'));
    }

    console.log("✅ [INITIATE-AND-CHECKOUT] Checkout session created successfully");

    // Return the checkout URL
    return new Response(JSON.stringify({
      success: true,
      guestReportId: initiateResponse.guestReportId,
      checkoutUrl: checkoutResponse.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error("❌ [INITIATE-AND-CHECKOUT] Error in orchestrated flow:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error occurred"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});