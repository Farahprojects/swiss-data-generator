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
    const { guest_report_id } = await req.json();

    if (!guest_report_id) {
      console.error("[orchestrate-report-ready] Missing guest_report_id");
      return new Response(
        JSON.stringify({ success: false, error: "guest_report_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[orchestrate-report-ready] Processing report: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch the guest report
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guest_report_id)
      .single();

    if (fetchError || !guestReport) {
      console.error("[orchestrate-report-ready] Failed to fetch guest report:", fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          guest_report_id 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[orchestrate-report-ready] Report found:`, {
      id: guestReport.id,
      email: guestReport.email,
      report_type: guestReport.report_type,
      payment_status: guestReport.payment_status,
      has_report: guestReport.has_report,
      swiss_boolean: guestReport.swiss_boolean,
      translator_log_id: guestReport.translator_log_id,
      report_log_id: guestReport.report_log_id
    });

    // Validate report is ready for orchestration
    const isReportReady = guestReport.swiss_boolean === true || 
                         (guestReport.has_report && (guestReport.translator_log_id || guestReport.report_log_id));

    if (!isReportReady) {
      console.warn(`[orchestrate-report-ready] Report not ready for orchestration:`, {
        swiss_boolean: guestReport.swiss_boolean,
        has_report: guestReport.has_report,
        translator_log_id: guestReport.translator_log_id,
        report_log_id: guestReport.report_log_id
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Report not ready for orchestration",
          guest_report_id,
          status: {
            swiss_boolean: guestReport.swiss_boolean,
            has_report: guestReport.has_report,
            has_translator_log: !!guestReport.translator_log_id,
            has_report_log: !!guestReport.report_log_id
          }
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful orchestration start
    console.log(`[orchestrate-report-ready] Report ready for orchestration:`, {
      guest_report_id,
      email: guestReport.email,
      report_type: guestReport.report_type
    });

    // ========================================
    // FUTURE EXPANSION POINTS
    // ========================================
    
    // 1. INSERT EVENT LOG
    // const { error: eventError } = await supabase
    //   .from("report_events")
    //   .insert({
    //     guest_report_id: guestReport.id,
    //     event_type: "orchestration_started",
    //     event_data: { 
    //       report_type: guestReport.report_type,
    //       timestamp: new Date().toISOString() 
    //     }
    //   });

    // 2. SEND NOTIFICATIONS
    // if (guestReport.email) {
    //   await sendReportReadyEmail(guestReport.email, guestReport);
    // }
    
    // 3. WEBSOCKET/SSE PUSH
    // await pushReportReadyNotification(guest_report_id);

    // 4. UPDATE ORCHESTRATION STATUS
    // await supabase
    //   .from("guest_reports")
    //   .update({ orchestration_status: "completed" })
    //   .eq("id", guest_report_id);

    console.log(`[orchestrate-report-ready] Orchestration completed successfully for: ${guest_report_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        guest_report_id,
        message: "Report orchestration completed",
        report_status: {
          email: guestReport.email,
          report_type: guestReport.report_type,
          is_swiss_only: guestReport.swiss_boolean === true,
          has_report: guestReport.has_report
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[orchestrate-report-ready] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});