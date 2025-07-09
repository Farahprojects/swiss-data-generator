import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

serve(async (req) => {
  const startTime = Date.now();
  console.log(`[orchestrate-report-ready] Request started at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[orchestrate-report-ready] Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error",
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("[orchestrate-report-ready] Request body received:", { keys: Object.keys(requestBody) });
    } catch (parseError) {
      console.error("[orchestrate-report-ready] Failed to parse JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON in request body",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { guest_report_id } = requestBody;

    // Validate guest_report_id
    if (!guest_report_id) {
      console.error("[orchestrate-report-ready] Missing guest_report_id");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id is required",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof guest_report_id !== 'string' || !isValidUUID(guest_report_id)) {
      console.error("[orchestrate-report-ready] Invalid guest_report_id format:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          provided: guest_report_id,
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[orchestrate-report-ready] Processing report: ${guest_report_id}`);

    // Initialize Supabase client with service role
    console.log("[orchestrate-report-ready] Initializing Supabase client...");
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );
    console.log("[orchestrate-report-ready] Supabase client initialized successfully");

    // Fetch the guest report
    console.log("[orchestrate-report-ready] Fetching guest report from database...");
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guest_report_id)
      .single();

    if (fetchError) {
      console.error("[orchestrate-report-ready] Database error fetching guest report:", {
        error: fetchError,
        guest_report_id,
        code: fetchError.code,
        message: fetchError.message
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while fetching guest report",
          guest_report_id,
          details: fetchError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!guestReport) {
      console.warn("[orchestrate-report-ready] Guest report not found:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          guest_report_id,
          timestamp: new Date().toISOString()
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
    
    const processingTime = Date.now() - startTime;
    console.log(`[orchestrate-report-ready] Total processing time: ${processingTime}ms`);

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
        },
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[orchestrate-report-ready] Unexpected error:", {
      error: error.message,
      stack: error.stack,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});