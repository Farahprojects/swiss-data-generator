
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

    console.log(`[orchestrate-report-ready] Processing report orchestration (called by link-report-guest): ${guest_report_id}`);

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

    // ✅ UPDATED: Validate report is ready for orchestration
    // Now that link-report-guest is the new boss, we expect:
    // - has_report_log = true (set by link-report-guest)
    // - modal_ready = true (set by link-report-guest)
    // - report_log_id exists (set by link-report-guest)
    const isReportReady = guestReport.has_report_log === true && 
                         guestReport.modal_ready === true && 
                         guestReport.report_log_id;

    if (!isReportReady) {
      console.warn(`[orchestrate-report-ready] Report not ready for orchestration:`, {
        has_report_log: guestReport.has_report_log,
        modal_ready: guestReport.modal_ready,
        report_log_id: guestReport.report_log_id,
        swiss_boolean: guestReport.swiss_boolean,
        has_report: guestReport.has_report,
        translator_log_id: guestReport.translator_log_id
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Report not ready for orchestration - link-report-guest must complete first",
          timestamp: new Date().toISOString()
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare complete report data for frontend - EXACT SAME FORMAT AS check-report-status
    const reportData = {
      guest_report: guestReport,
      report_content: guestReport.report_logs?.report_text || null,
      swiss_data: guestReport.translator_logs?.swiss_data || null,
      metadata: {
        content_type: guestReport.swiss_boolean && guestReport.is_ai_report ? 'both' : 
                     guestReport.swiss_boolean ? 'astro' : 
                     guestReport.is_ai_report ? 'ai' : 'none',
        has_ai_report: !!guestReport.is_ai_report,
        has_swiss_data: !!guestReport.translator_logs?.swiss_data,
        is_ready: true
      }
    };

    console.log(`[orchestrate-report-ready] Report orchestration completed (triggered by link-report-guest): ${guest_report_id}`);
    
    // Send realtime message to SuccessScreen
    console.log(`[orchestrate-report-ready] Broadcasting report data to realtime channel: guest_report:${guest_report_id}`);
    
    const channel = supabase.channel(`guest_report:${guest_report_id}`);
    await channel.send({
      type: 'broadcast',
      event: 'report_ready',
      payload: {
        ok: true,
        ready: true,
        data: reportData
      }
    });

    console.log(`[orchestrate-report-ready] Realtime broadcast sent successfully`);

    // NEW: Call create-temp-report-data function to create temp data for ChatGPT button
    console.log(`[orchestrate-report-ready] Creating temp report data for ChatGPT functionality...`);
    try {
      const { data: tempResult, error: tempError } = await supabase.functions.invoke('create-temp-report-data', {
        body: { guest_report_id: guest_report_id }
      });

      if (tempError) {
        console.warn(`[orchestrate-report-ready] Temp data creation failed (non-blocking):`, tempError);
      } else {
        console.log(`[orchestrate-report-ready] Temp data created successfully:`, {
          temp_data_id: tempResult?.temp_data_id,
          chat_hash: tempResult?.chat_hash,
          expires_at: tempResult?.expires_at
        });
      }
    } catch (tempCreateError) {
      console.warn(`[orchestrate-report-ready] Temp data creation error (non-blocking):`, tempCreateError);
    }
    
    const processingTime = Date.now() - startTime;

    // Return EXACT SAME FORMAT as check-report-status
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
