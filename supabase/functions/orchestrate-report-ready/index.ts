
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
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[orchestrate-report-ready][${requestId}] 🚀 Request started at ${new Date().toISOString()}`);

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

    console.log(`[orchestrate-report-ready][${requestId}] 📋 Processing report orchestration: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the guest report data
    console.log(`[orchestrate-report-ready][${requestId}] 🔍 Fetching guest report data...`);
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("id, email, report_type, is_ai_report, swiss_boolean, created_at")
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

    // Fetch report data from report_logs where is_guest = true
    console.log(`[orchestrate-report-ready][${requestId}] 🔍 Fetching report_logs data...`);
    const { data: reportLogs, error: reportLogsError } = await supabase
      .from("report_logs")
      .select("report_text, created_at")
      .eq("is_guest", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    let reportLogData: { report_text: string } | null = null;
    if (!reportLogsError && reportLogs) {
      reportLogData = reportLogs as { report_text: string };
    } else {
      console.warn(`[orchestrate-report-ready] Could not fetch report_logs:`, reportLogsError);
    }

    // Fetch translator data from translator_logs where is_guest = true
    console.log(`[orchestrate-report-ready][${requestId}] 🔍 Fetching translator_logs data...`);
    const { data: translatorLogs, error: translatorLogsError } = await supabase
      .from("translator_logs")
      .select("swiss_data, created_at")
      .eq("is_guest", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    let translatorLogData: { swiss_data: any } | null = null;
    if (!translatorLogsError && translatorLogs) {
      translatorLogData = translatorLogs as { swiss_data: any };
    } else {
      console.warn(`[orchestrate-report-ready] Could not fetch translator_logs:`, translatorLogsError);
    }

    // ✅ UPDATED: Trust-based validation - if this function is called, the report is ready
    // No validation conditions - we trust the calling function knows what it's doing
    console.log(`[orchestrate-report-ready][${requestId}] ✅ Trusting that report is ready (no validation checks)`);

    // Prepare complete report data for frontend - EXACT SAME FORMAT AS check-report-status
    const reportData = {
      guest_report: guestReport,
      report_content: reportLogData?.report_text || null,
      swiss_data: translatorLogData?.swiss_data || null,
      metadata: {
        content_type: guestReport.swiss_boolean && guestReport.is_ai_report ? 'both' : 
                     guestReport.swiss_boolean ? 'astro' : 
                     guestReport.is_ai_report ? 'ai' : 'none',
        has_ai_report: !!guestReport.is_ai_report,
        has_swiss_data: !!translatorLogData?.swiss_data,
        is_ready: true
      }
    };

          console.log(`[orchestrate-report-ready][${requestId}] ✅ Report orchestration completed: ${guest_report_id}`);
    
    // Fire-and-forget: Call create-temp-report-data function (no await, no error handling)
    console.log(`[orchestrate-report-ready] Firing create-temp-report-data (fire-and-forget)...`);
    supabase.functions.invoke('create-temp-report-data', {
      body: { guest_report_id: guest_report_id }
    }).catch(() => {
      // Silently ignore any errors - this is fire-and-forget
    });
    
    const processingTime = Date.now() - startTime;

    // Return report data directly - no WebSocket broadcast needed
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
