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
  console.log(`[finalize-report][${requestId}] 🚀 Request started at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[finalize-report] Missing environment variables");
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
      console.log("[finalize-report] Request body received:", { keys: Object.keys(requestBody) });
    } catch (parseError) {
      console.error("[finalize-report] Failed to parse JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON in request body",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { guest_report_id, report_log_id } = requestBody;

    // Validate required fields
    if (!guest_report_id || typeof guest_report_id !== 'string' || !isValidUUID(guest_report_id)) {
      console.error("[finalize-report] Invalid guest_report_id format:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!report_log_id || typeof report_log_id !== 'string' || !isValidUUID(report_log_id)) {
      console.error("[finalize-report] Invalid report_log_id format:", report_log_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "report_log_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[finalize-report][${requestId}] 📋 Processing report finalization: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ STEP 1: UPDATE guest_reports (atomic operation)
    console.log(`[finalize-report][${requestId}] 🔄 Updating guest_reports table...`);
    
    const { data: updatedGuestReport, error: updateError } = await supabase
      .from("guest_reports")
      .update({
        report_log_id: report_log_id,
        has_report_log: true,
        modal_ready: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", guest_report_id)
      .select(`
        *,
        report_logs!guest_reports_report_log_id_fkey(report_text),
        translator_logs!guest_reports_translator_log_id_fkey(swiss_data)
      `)
      .single();

    if (updateError) {
      console.error("[finalize-report] Database update error:", updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while updating guest report",
          details: updateError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updatedGuestReport) {
      console.warn("[finalize-report] Guest report not found after update:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[finalize-report][${requestId}] ✅ Guest report updated successfully:`, {
      guest_report_id: guest_report_id,
      report_log_id: report_log_id,
      modal_ready: updatedGuestReport.modal_ready,
      has_report_log: updatedGuestReport.has_report_log
    });

    // ✅ STEP 2: Build payload from the updated row
    const reportData = {
      guest_report: updatedGuestReport,
      report_content: updatedGuestReport.report_logs?.report_text || null,
      swiss_data: updatedGuestReport.translator_logs?.swiss_data || null,
      metadata: {
        content_type: updatedGuestReport.swiss_boolean && updatedGuestReport.is_ai_report ? 'both' : 
                     updatedGuestReport.swiss_boolean ? 'astro' : 
                     updatedGuestReport.is_ai_report ? 'ai' : 'none',
        has_ai_report: !!updatedGuestReport.is_ai_report,
        has_swiss_data: !!updatedGuestReport.translator_logs?.swiss_data,
        is_ready: true
      }
    };

    // ✅ STEP 3: Broadcast immediately after successful update
    console.log(`[finalize-report][${requestId}] 📡 Broadcasting report data to realtime channel: guest_report:${guest_report_id} at ${new Date().toISOString()}`);
    
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

    console.log(`[finalize-report][${requestId}] ✅ Realtime broadcast sent successfully at ${new Date().toISOString()}`);

    // ✅ STEP 4: Create temp report data for ChatGPT functionality (non-blocking)
    console.log(`[finalize-report] Creating temp report data for ChatGPT functionality...`);
    try {
      const { data: tempResult, error: tempError } = await supabase.functions.invoke('create-temp-report-data', {
        body: { guest_report_id: guest_report_id }
      });

      if (tempError) {
        console.warn(`[finalize-report] Temp data creation failed (non-blocking):`, tempError);
      } else {
        console.log(`[finalize-report] Temp data created successfully:`, {
          temp_data_id: tempResult?.temp_data_id,
          chat_hash: tempResult?.chat_hash,
          expires_at: tempResult?.expires_at
        });
      }
    } catch (tempCreateError) {
      console.warn(`[finalize-report] Temp data creation error (non-blocking):`, tempCreateError);
    }
    
    const processingTime = Date.now() - startTime;

    console.log(`[finalize-report][${requestId}] ✅ Report finalization completed successfully: ${guest_report_id} (${processingTime}ms)`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Report finalized successfully",
        guest_report_id: guest_report_id,
        report_log_id: report_log_id,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[finalize-report] Unexpected error:", error);
    
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