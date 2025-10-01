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
      
      // Warm-up check
      if (requestBody?.warm === true) {
        return new Response("Warm-up", { status: 200, headers: corsHeaders });
      }
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

    // Fetch report data from report_logs where chat_id = guest_report_id
    console.log(`[get-report-data][${requestId}] 🔍 Fetching report_logs data...`);
    const { data: reportLogs, error: reportLogsError } = await supabase
      .from("report_logs")
      .select("report_text, created_at")
      .eq("chat_id", guest_report_id)
      .single();
    
    let reportLogData: { report_text: string } | null = null;
    if (!reportLogsError && reportLogs) {
      reportLogData = reportLogs as { report_text: string };
    } else {
      console.warn(`[get-report-data] Could not fetch report_logs:`, reportLogsError);
    }

    // Fetch translator data from translator_logs where chat_id = guest_report_id
    console.log(`[get-report-data][${requestId}] 🔍 Fetching translator_logs data...`);
    const { data: translatorLogs, error: translatorLogsError } = await supabase
      .from("translator_logs")
      .select("swiss_data, created_at")
      .eq("chat_id", guest_report_id)
      .single();
    
    let translatorLogData: { swiss_data: any } | null = null;
    if (!translatorLogsError && translatorLogs) {
      translatorLogData = translatorLogs as { swiss_data: any };
    } else {
      console.warn(`[get-report-data] Could not fetch translator_logs:`, translatorLogsError);
    }

    // Fetch conversation meta to get the original form data (for authenticated users)
    console.log(`[get-report-data][${requestId}] 🔍 Fetching conversation meta for form data...`);
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("meta")
      .eq("id", guest_report_id)
      .single();
    
    let formData: any = null;
    if (!convError && conversation?.meta?.last_report_form) {
      formData = conversation.meta.last_report_form;
      console.log(`[get-report-data][${requestId}] ✅ Found form data in conversation meta`);
    } else {
      console.log(`[get-report-data][${requestId}] ℹ️ No form data found in conversation meta`);
    }

    // Check if we have any data (either report text OR Swiss data)
    const hasReportText = !!reportLogData?.report_text;
    const hasSwissData = !!translatorLogData?.swiss_data;
    const hasAnyData = hasReportText || hasSwissData;
    
    if (!hasAnyData) {
      console.warn(`[get-report-data] No data found - no report_text or swiss_data: ${guest_report_id}`);
      return new Response(
        JSON.stringify({ 
          ready: false, 
          error: "No report or astro data found",
          timestamp: new Date().toISOString()
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare complete report data for frontend
    const reportData = {
      report_content: reportLogData?.report_text || null,
      swiss_data: translatorLogData?.swiss_data || null,
      metadata: {
        content_type: hasReportText && hasSwissData ? 'both' : (hasReportText ? 'ai' : 'astro'),
        has_ai_report: hasReportText,
        has_swiss_data: hasSwissData,
        is_ready: true,
        report_type: formData?.reportType || formData?.request || 'unknown'
      },
      // Include form data for the formatter (matching legacy structure)
      guest_report: formData ? {
        report_data: {
          birthDate: formData.person_a?.birth_date,
          birthTime: formData.person_a?.birth_time,
          birthLocation: formData.person_a?.location,
          latitude: formData.person_a?.latitude,
          longitude: formData.person_a?.longitude,
          name: formData.person_a?.name || formData.name,
          request: formData.request,
          reportType: formData.reportType,
          // Include person_b for synastry reports
          ...(formData.person_b && {
            secondPersonName: formData.person_b.name,
            secondPersonBirthDate: formData.person_b.birth_date,
            secondPersonBirthTime: formData.person_b.birth_time,
            secondPersonBirthLocation: formData.person_b.location,
            secondPersonLatitude: formData.person_b.latitude,
            secondPersonLongitude: formData.person_b.longitude
          })
        }
      } : null
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