import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Initialize Supabase client with internal API key
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const edgeInternalKey = Deno.env.get("EDGE_INTERNAL_API_KEY")!;
const supabase = createClient(supabaseUrl, edgeInternalKey, {
  auth: { persistSession: false }
});

interface ReportPayload {
  endpoint: string;
  report_type: string;
  user_id?: string;
  apiKey?: string;
  chartData: any;
  is_guest?: boolean;
  [k: string]: any;
}

// Available engines for simple round-robin selection
const ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
];

// Simple engine selection (no DB required)
function getNextEngine(): string {
  // Use timestamp-based selection for simple round-robin
  const timestamp = Date.now();
  const engineIndex = Math.floor(timestamp / 1000) % ENGINES.length;
  const selectedEngine = ENGINES[engineIndex];
  
  console.log(`[report-orchestrator] Selected engine: ${selectedEngine} (timestamp-based selection)`);
  return selectedEngine;
}

// Validate that the report type exists in prompts
// REMOVED: Unnecessary database lookup - report types are validated upstream
function validateReportType(reportType: string): boolean {
  // Simple validation - report types are validated upstream
  if (!reportType || typeof reportType !== 'string') {
    console.warn(`[report-orchestrator] Invalid report type: ${reportType}`);
    return false;
  }
  
  console.log(`[report-orchestrator] Report type validated: ${reportType}`);
  return true;
}

// Call the selected engine (fire-and-forget)
function callEngineFireAndForget(engine: string, payload: ReportPayload): void {
  const edgeUrl = `${supabaseUrl}/functions/v1/${engine}`;
  const requestPayload = { 
    ...payload, 
    reportType: payload.report_type, 
    selectedEngine: engine 
  };
  
  console.log(`[report-orchestrator] Calling engine: ${engine}`);
  
  fetch(edgeUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${edgeInternalKey}`
    },
    body: JSON.stringify(requestPayload),
  }).catch(error => {
    console.error(`[report-orchestrator] Engine ${engine} fire-and-forget failed:`, error);
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload: ReportPayload = await req.json();
    
    // Warm-up check
    if (payload?.warm === true) {
      return new Response("Warm-up", { status: 200, headers: corsHeaders });
    }
    
    console.log(`[report-orchestrator] Processing request for report type: ${payload.report_type}`);
    
    // Step 1: Validate report type exists
    const isValidReportType = validateReportType(payload.report_type);
    if (!isValidReportType) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid report type" 
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    // Step 2: Select next engine using simple timestamp-based selection
    const selectedEngine = getNextEngine();
    
    // Step 3: Call the engine (fire-and-forget)
    callEngineFireAndForget(selectedEngine, payload);
    
    // Return immediately - don't wait for engine response
    return new Response(JSON.stringify({ 
      success: true,
      engine: selectedEngine,
      message: "Report generation initiated"
    }), {
      status: 200,
      headers: corsHeaders,
    });
    
  } catch (error) {
    console.error("[report-orchestrator] Request processing failed:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal server error" 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}); 