
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
      console.error("[orchestrate-report-ready] Missing environment variables");
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
    if (!guest_report_id || typeof guest_report_id !== 'string' || !isValidUUID(guest_report_id)) {
      console.error("[orchestrate-report-ready] Invalid guest_report_id format:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[orchestrate-report-ready] Processing report: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the guest report with related data
    console.log("[orchestrate-report-ready] Fetching complete report data...");
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select(`
        *,
        report_logs!guest_reports_report_log_id_fkey(report_text),
        translator_logs!guest_reports_translator_log_id_fkey(swiss_data)
      `)
      .eq("id", guest_report_id)
      .single();

    if (fetchError) {
      console.error("[orchestrate-report-ready] Database error:", fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while fetching guest report",
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
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          timestamp: new Date().toISOString()
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare complete report data for frontend
    const reportData = {
      guest_report: guestReport,
      report_content: guestReport.report_logs?.report_text || null,
      swiss_data: guestReport.translator_logs?.swiss_data || null,
      metadata: {
        is_astro_report: !!guestReport.swiss_boolean,
        is_ai_report: !!guestReport.is_ai_report,
        content_type: guestReport.swiss_boolean && guestReport.is_ai_report ? 'both' : 
                     guestReport.swiss_boolean ? 'astro' : 
                     guestReport.is_ai_report ? 'ai' : 'none'
      }
    };

    // Broadcast to frontend via realtime channel
    console.log(`[orchestrate-report-ready] Broadcasting report data to frontend...`);
    const channel = supabase.channel(`report-ready-${guest_report_id}`);
    
    // Send the report data directly to the frontend
    await channel.send({
      type: 'broadcast',
      event: 'report_ready',
      payload: {
        guest_report_id,
        report_data: reportData
      }
    });

    console.log(`[orchestrate-report-ready] Report orchestration completed for: ${guest_report_id}`);
    
    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({ 
        success: true, 
        guest_report_id,
        message: "Report orchestration completed and broadcast to frontend",
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[orchestrate-report-ready] Unexpected error:", error);
    
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
