// latest vesrion 29th
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface VerifyGuestPaymentRequest {
  sessionId: string;
  type?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, type } = await req.json() as VerifyGuestPaymentRequest;
    
    console.log(`🔄 [verify-guest-payment] Processing request for sessionId: ${sessionId}, type: ${type}`);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Step 1: Fetch guest report data
    console.log(`🔍 [verify-guest-payment] Fetching guest report: ${sessionId}`);
    
    const { data: guestReport, error: queryError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (queryError || !guestReport) {
      console.error(`❌ [verify-guest-payment] Guest report not found: ${sessionId}`, queryError);
      return new Response(JSON.stringify({ 
        error: "Guest report not found",
        sessionId 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`✅ [verify-guest-payment] Guest report found:`, {
      id: guestReport.id,
      payment_status: guestReport.payment_status,
      report_type: guestReport.report_type,
      is_ai_report: guestReport.is_ai_report
    });

    // Step 2: Pass to translator-edge (fire-and-forget)
    console.log(`🔄 [verify-guest-payment] Passing to translator-edge with chat_id: ${guestReport.chat_id}`);
    
    const translatorPayload = {
      ...guestReport.report_data,
      request: guestReport.report_data?.request || guestReport.report_type?.split('_')[0] || 'essence',
      reportType: guestReport.report_type,
      is_guest: true,
      is_ai_report: guestReport.is_ai_report,
      user_id: guestReport.chat_id,
      request_id: crypto.randomUUID().slice(0, 8),
      email: guestReport.email,
      name: guestReport.report_data?.person_a?.name || guestReport.report_data?.name
    };

    // Fire-and-forget call to translator-edge
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('translator-edge', {
        body: translatorPayload
      }).catch((error) => {
        console.error(`❌ [verify-guest-payment] Translator-edge failed: ${sessionId}`, error);
      })
    );

    console.log(`✅ [verify-guest-payment] Successfully passed to translator-edge with chat_id: ${guestReport.chat_id}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      message: "Report generation triggered successfully",
      processing_time_ms: Date.now() - Date.now() // Placeholder for actual timing
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error(`❌ [verify-guest-payment] Unexpected error:`, error);
    
    return new Response(JSON.stringify({
      error: error.message || "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
