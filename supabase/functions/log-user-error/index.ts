import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { guestReportId, errorType, errorMessage, email } = await req.json();

    if (!errorType) {
      throw new Error("errorType is required");
    }

    // Get the guest report for context (if guestReportId exists)
    let guestReport = null;
    if (guestReportId) {
      const { data } = await supabase
        .from('guest_reports')
        .select('*')
        .eq('id', guestReportId)
        .single();
      guestReport = data;
    }

    // Check if there's already an existing error record for this guest report
    if (guestReportId) {
      const { data: existingError } = await supabase
        .from('user_errors')
        .select('case_number')
        .eq('guest_report_id', guestReportId)
        .single();

      if (existingError) {
        console.log("[log-user-error] Found existing error record:", existingError.case_number);
        return new Response(JSON.stringify({
          success: true,
          case_number: existingError.case_number,
          message: "We've already logged this issue and updated our backend. Would you like to return to the home page?",
          is_duplicate: true
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Insert error log with service role permissions
    const { data: errorLog, error } = await supabase
      .from('user_errors')
      .insert({
        guest_report_id: guestReportId,
        email: guestReport?.email || email || 'unknown',
        error_type: errorType,
        price_paid: guestReport?.amount_paid || null,
        error_message: errorMessage,
        metadata: {
          payment_status: guestReport?.payment_status,
          has_report: guestReport?.has_report,
          stripe_session_id: guestReport?.stripe_session_id,
          report_type: guestReport?.report_type
        }
      })
      .select('case_number')
      .single();

    if (error) {
      console.error("[log-user-error] Database error:", error);
      throw new Error(`Failed to log error: ${error.message}`);
    }

    console.log("[log-user-error] Successfully logged error with case number:", errorLog?.case_number);

    return new Response(JSON.stringify({
      success: true,
      case_number: errorLog?.case_number
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[log-user-error] Error:", err.message);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});