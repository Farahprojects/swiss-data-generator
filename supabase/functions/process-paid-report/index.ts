import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface ProcessPaidReportRequest {
  guest_id: string;
  chat_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { guest_id, chat_id } = await req.json() as ProcessPaidReportRequest;
    
    console.log(`🔄 [process-paid-report] Processing request for guest_id: ${guest_id}, chat_id: ${chat_id}`);

    if (!guest_id) {
      return new Response(JSON.stringify({ error: "guest_id is required" }), {
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

    // Step 1: Look up the guest report
    console.log(`🔍 [process-paid-report] Looking up guest report: ${guest_id}`);
    
    const { data: guestReport, error: queryError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guest_id)
      .single();

    if (queryError || !guestReport) {
      console.error(`❌ [process-paid-report] Guest report not found: ${guest_id}`, queryError);
      return new Response(JSON.stringify({ 
        error: "Guest report not found",
        guest_id 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`✅ [process-paid-report] Guest report found:`, {
      id: guestReport.id,
      payment_status: guestReport.payment_status,
      report_generated: guestReport.report_generated,
      is_ai_report: guestReport.is_ai_report
    });

    // Step 2: Check conditions
    if (guestReport.payment_status !== 'paid') {
      console.log(`⚠️ [process-paid-report] Payment not completed: ${guestReport.payment_status}`);
      return new Response(JSON.stringify({ 
        error: "Payment not completed",
        payment_status: guestReport.payment_status,
        guest_id 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (guestReport.report_generated) {
      console.log(`ℹ️ [process-paid-report] Report already generated for: ${guest_id}`);
      return new Response(JSON.stringify({ 
        message: "Report already generated",
        guest_id,
        already_generated: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 3: Mark as generated to prevent duplicate processing
    console.log(`🔄 [process-paid-report] Marking report as generated: ${guest_id}`);
    
    const { error: updateError } = await supabase
      .from("guest_reports")
      .update({ report_generated: true })
      .eq("id", guest_id)
      .eq("report_generated", false); // Ensure we only update if not already generated

    if (updateError) {
      console.error(`❌ [process-paid-report] Failed to update report_generated: ${guest_id}`, updateError);
      return new Response(JSON.stringify({ 
        error: "Failed to update report status",
        guest_id 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 4: Fire-and-forget report generation via verify-guest-payment
    console.log(`🔄 [process-paid-report] Triggering report generation via verify-guest-payment: ${guest_id}`);
    
    // TRUE fire-and-forget - don't wait for response at all
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('verify-guest-payment', {
        body: {
          sessionId: guest_id,
          type: 'promo'
        }
      }).catch((error) => {
        console.error(`❌ [process-paid-report] Report generation failed: ${guest_id}`, error);
      })
    );

    console.log(`✅ [process-paid-report] Successfully processed paid report: ${guest_id}`);

    return new Response(JSON.stringify({
      success: true,
      guest_id,
      message: "Report generation triggered successfully",
      processing_time_ms: Date.now() - Date.now() // Placeholder for actual timing
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error(`❌ [process-paid-report] Unexpected error:`, error);
    
    return new Response(JSON.stringify({
      error: error.message || "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 