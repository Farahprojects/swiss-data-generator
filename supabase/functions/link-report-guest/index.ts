/* eslint-disable no-console */

/*───────────────────────────────────────────────────────────────────────────────
  link-report-guest/index.ts
  Edge Function: Links guest reports with report logs and triggers orchestration
  Updates guest_reports table with report_log_id and calls orchestrate-report-ready
  Includes proper error handling and logging
────────────────────────────────────────────────────────────────────────────────*/
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch polyfill for Edge runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*───────────────────────────────────────────────────────────────────────────────
  CONFIG & SINGLETONS
────────────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");

// Initialize Supabase client
let supabase: SupabaseClient;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (err) {
  throw err;
}

// CORS headers for cross-domain requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/*───────────────────────────────────────────────────────────────────────────────
  TYPES
────────────────────────────────────────────────────────────────────────────────*/
interface LinkReportGuestRequest {
  guest_report_id: string;
  report_log_id: string;
}

interface LinkReportGuestResponse {
  success: boolean;
  message: string;
  requestId?: string;
}

/*───────────────────────────────────────────────────────────────────────────────
  UTILS
────────────────────────────────────────────────────────────────────────────────*/
function jsonResponse(body: unknown, init: ResponseInit = {}, requestId?: string): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

// Call orchestrate-report-ready function
async function callOrchestrateReportReady(guestReportId: string, requestId: string): Promise<void> {
  const logPrefix = `[link-report-guest][${requestId}]`;
  
  try {
    console.log(`${logPrefix} Calling orchestrate-report-ready for guest_report_id: ${guestReportId}`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrate-report-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        guest_report_id: guestReportId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} orchestrate-report-ready call failed:`, {
        status: response.status,
        error: errorText
      });
      throw new Error(`orchestrate-report-ready failed: ${response.status} - ${errorText}`);
    }

    console.log(`${logPrefix} orchestrate-report-ready called successfully`);
  } catch (error) {
    console.error(`${logPrefix} Error calling orchestrate-report-ready:`, error);
    throw error;
  }
}

/*───────────────────────────────────────────────────────────────────────────────
  MAIN HANDLER
────────────────────────────────────────────────────────────────────────────────*/
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const logPrefix = `[link-report-guest][${requestId}]`;

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: CORS_HEADERS });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", requestId },
      { status: 405 },
      requestId
    );
  }

  try {
    // Parse the request payload
    let requestData: LinkReportGuestRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error(`${logPrefix} Invalid JSON payload:`, parseError);
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }

    // ✅ LOGGING: Request received
    console.log(`${logPrefix} Request received:`, {
      guest_report_id: requestData.guest_report_id,
      report_log_id: requestData.report_log_id
    });

    // Validate required fields
    if (!requestData.guest_report_id || !requestData.report_log_id) {
      console.error(`${logPrefix} Validation failed: Missing required fields`);
      return jsonResponse(
        { error: "Missing required fields: guest_report_id and report_log_id are required", requestId },
        { status: 400 },
        requestId
      );
    }

    // Update guest_reports table
    console.log(`${logPrefix} Updating guest_reports table...`);
    
    const { error: updateError } = await supabase
      .from("guest_reports")
      .update({
        report_log_id: requestData.report_log_id,
        has_report_log: true,
        modal_ready: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestData.guest_report_id);

    if (updateError) {
      console.error(`${logPrefix} Guest report update failed:`, updateError);
      return jsonResponse(
        { 
          success: false, 
          error: "Failed to update guest report", 
          details: updateError.message,
          requestId 
        },
        { status: 500 },
        requestId
      );
    }

    console.log(`${logPrefix} Guest report updated successfully:`, {
      guest_report_id: requestData.guest_report_id,
      report_log_id: requestData.report_log_id
    });

    // Call orchestrate-report-ready function
    try {
      await callOrchestrateReportReady(requestData.guest_report_id, requestId);
      
      console.log(`${logPrefix} Process completed successfully`);
      
      return jsonResponse({
        success: true,
        message: "Guest report linked and orchestration triggered successfully",
        requestId
      }, {}, requestId);

    } catch (orchestrateError) {
      console.error(`${logPrefix} Orchestration failed:`, orchestrateError);
      
      // Return success for the linking part, but log the orchestration failure
      return jsonResponse({
        success: true,
        message: "Guest report linked successfully, but orchestration failed",
        warning: "Report linking completed but orchestration failed",
        requestId
      }, {}, requestId);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    
    console.error(`${logPrefix} Main handler error:`, {
      error: errorMessage
    });
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      requestId
    }, { status: 500 }, requestId);
  }
}); 