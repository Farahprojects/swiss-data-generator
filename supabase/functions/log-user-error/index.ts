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

    const { email, errorType, errorMessage } = await req.json();

    if (!email || !errorType) {
      throw new Error("Email and errorType are required");
    }

    // Get the latest guest report for additional context
    const { data: guestReport } = await supabase
      .from('guest_reports')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Insert error log with service role permissions
    const { data: errorLog, error } = await supabase
      .from('user_errors')
      .insert({
        guest_report_id: guestReport?.id || null,
        email,
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
      throw new Error(`Failed to log error: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      case_number: errorLog.case_number
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