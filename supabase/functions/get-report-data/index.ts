import { serve } from "jsr:@std/http/server";
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
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[get-report-data][${requestId}] 🚀 Request started at ${new Date().toISOString()} - DEPLOYMENT TRIGGER`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-report-data] Missing environment variables");
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
      console.log("[get-report-data] Request body received:", { keys: Object.keys(requestBody) });
    } catch (parseError) {
      console.error("[get-report-data] Failed to parse JSON:", parseError);
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
      console.error("[get-report-data] Invalid guest_report_id format:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-report-data][${requestId}] 📋 Fetching report data: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the guest report data
    console.log(`[get-report-data][${requestId}] 🔍 Fetching guest report data...`);
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("id, email, report_type, is_ai_report, created_at, payment_status, report_data")
      .eq("id", guest_report_id)
      .single();

    if (fetchError) {
      console.error("[get-report-data] Database error:", fetchError);
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
      console.warn("[get-report-data] Guest report not found:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch report data from report_logs where user_id = guest_report_id
    console.log(`[get-report-data][${requestId}] 🔍 Fetching report_logs data...`);
    const { data: reportLogs, error: reportLogsError } = await supabase
      .from("report_logs")
      .select("report_text, created_at")
      .eq("user_id", guest_report_id)
      .single();
    
    let reportLogData: { report_text: string } | null = null;
    if (!reportLogsError && reportLogs) {
      reportLogData = reportLogs as { report_text: string };
    } else {
      console.warn(`[get-report-data] Could not fetch report_logs:`, reportLogsError);
    }

    // Fetch translator data from translator_logs where user_id = guest_report_id
    console.log(`[get-report-data][${requestId}] 🔍 Fetching translator_logs data...`);
    const { data: translatorLogs, error: translatorLogsError } = await supabase
      .from("translator_logs")
      .select("swiss_data, created_at")
      .eq("user_id", guest_report_id)
      .single();
    
    let translatorLogData: { swiss_data: any } | null = null;
    if (!translatorLogsError && translatorLogs) {
      translatorLogData = translatorLogs as { swiss_data: any };
    } else {
      console.warn(`[get-report-data] Could not fetch translator_logs:`, translatorLogsError);
    }

    // Check if we have report data (indicating the report is ready)
    if (!reportLogData?.report_text) {
      console.warn(`[get-report-data] Report not ready - no report_text found: ${guest_report_id}`);
      return new Response(
        JSON.stringify({ 
          ready: false, 
          error: "Report data not yet cached",
          timestamp: new Date().toISOString()
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare complete report data for frontend
    const reportData = {
      guest_report: guestReport,
      report_content: reportLogData?.report_text || null,
      swiss_data: translatorLogData?.swiss_data || null,
      metadata: {
        content_type: translatorLogData?.swiss_data && guestReport.is_ai_report ? 'both' : 
                     translatorLogData?.swiss_data ? 'astro' : 
                     guestReport.is_ai_report ? 'ai' : 'none',
        has_ai_report: !!guestReport.is_ai_report,
        has_swiss_data: !!translatorLogData?.swiss_data,
        is_ready: true
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`[get-report-data][${requestId}] ✅ Report data retrieved in ${processingTime}ms: ${guest_report_id}`);
    
    // Return report data
    return new Response(
      JSON.stringify({ 
        ok: true, 
        ready: true, 
        data: reportData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[get-report-data] Unexpected error:", error);
    
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