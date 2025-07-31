import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Available engines for round-robin selection
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
];

interface ReportPayload {
  endpoint: string;
  report_type: string;
  user_id?: string;
  apiKey?: string;
  chartData: any;
  is_guest?: boolean;
  [k: string]: any;
}

// Get the next engine using round-robin selection
async function getNextEngine(): Promise<string> {
  try {
    const { data: last, error } = await supabase
      .from("report_logs")
      .select("engine_used")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.warn("[report-orchestrator] Engine selection error, using first engine:", error);
      return EDGE_ENGINES[0];
    }
    
    const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
    const nextEngine = EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
    
    console.log(`[report-orchestrator] Selected engine: ${nextEngine} (last was: ${last?.engine_used || 'none'})`);
    return nextEngine;
  } catch (error) {
    console.error("[report-orchestrator] Engine selection failed:", error);
    return EDGE_ENGINES[0];
  }
}

// Validate that the report type exists in prompts
async function validateReportType(reportType: string): Promise<boolean> {
  try {
    const { data: promptExists, error } = await supabase
      .from("report_prompts")
      .select("name")
      .eq("name", reportType)
      .maybeSingle();
    
    if (error) {
      console.error("[report-orchestrator] Prompt validation error:", error);
      return false;
    }
    
    if (!promptExists) {
      console.warn(`[report-orchestrator] Report type not found: ${reportType}`);
      return false;
    }
    
    console.log(`[report-orchestrator] Report type validated: ${reportType}`);
    return true;
  } catch (error) {
    console.error("[report-orchestrator] Prompt validation failed:", error);
    return false;
  }
}

// Call the selected engine
async function callEngine(engine: string, payload: ReportPayload): Promise<void> {
  try {
    const edgeUrl = `${supabaseUrl}/functions/v1/${engine}`;
    const requestPayload = { 
      ...payload, 
      reportType: payload.report_type, 
      selectedEngine: engine 
    };
    
    console.log(`[report-orchestrator] Calling engine: ${engine}`);
    
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(requestPayload),
    });
    
    if (!response.ok) {
      throw new Error(`Engine ${engine} returned ${response.status}: ${await response.text()}`);
    }
    
    console.log(`[report-orchestrator] Engine ${engine} called successfully`);
  } catch (error) {
    console.error(`[report-orchestrator] Engine ${engine} call failed:`, error);
    throw error;
  }
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
    
    console.log(`[report-orchestrator] Processing request for report type: ${payload.report_type}`);
    
    // Step 1: Validate report type exists
    const isValidReportType = await validateReportType(payload.report_type);
    if (!isValidReportType) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid report type" 
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    // Step 2: Select next engine
    const selectedEngine = await getNextEngine();
    
    // Step 3: Call the engine (fire-and-forget)
    callEngine(selectedEngine, payload).catch(error => {
      console.error(`[report-orchestrator] Engine call failed:`, error);
    });
    
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