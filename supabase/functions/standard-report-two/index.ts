

/* eslint-disable no-console */

/*─────────────────────Made──────────────────────────────────────────────────────────
  standard-report.ts
  Edge Function: Generates standard reports using OpenAI's GPT-4o model
  Uses system prompts from the reports_prompts table
  Enhanced for production readiness with retries, timeouts, and structured logging.
────────────────────────────────────────────────────────────────────────────────*/
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*───────────────────────────────────────────────────────────────────────────────
  CONFIG & SINGLETONS
────────────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";

// Production Readiness Configuration
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000"); 

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY_THREE");

// Initialize Supabase client
let supabase: SupabaseClient;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
} catch (err) {
  throw err;
}

const OPENAI_MODEL = "gpt-4o";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Simple in-memory cache for system prompts
const promptCache = new Map<string, string>();

// CORS headers for cross-domain requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '600',
  'Content-Type': 'application/json',
};

/*───────────────────────────────────────────────────────────────────────────────
  UTILS
────────────────────────────────────────────────────────────────────────────────*/
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

// Fetch the system prompt from the reports_prompts table - now accepts reportType parameter
async function getSystemPrompt(reportType: string, requestId: string): Promise<string> {
  const logPrefix = `[standard-report-two][${requestId}]`;

  // 1. Check cache first
  if (promptCache.has(reportType)) {
    console.log(`${logPrefix} Cache HIT for system prompt: ${reportType}`);
    return promptCache.get(reportType)!;
  }
  
  console.log(`${logPrefix} Cache MISS for system prompt: ${reportType}. Fetching from DB.`);

  // Direct, single fetch from the database. No retry logic.
  const { data, error, status } = await supabase
    .from("report_prompts")
    .select("system_prompt")
    .eq("name", reportType)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch system prompt (status ${status}): ${error.message}`);
  }

  if (!data || !data.system_prompt) {
    throw new Error(`System prompt not found for ${reportType} report`);
  }
  
  // 2. Store in cache on successful fetch
  promptCache.set(reportType, data.system_prompt);
  
  return data.system_prompt;
}

// Generate report using OpenAI API
async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<{ report: string; metadata: any }> {
  const logPrefix = `[standard-report-two][${requestId}]`;

  // Structure data for the prompt. The AI will get the full chartData.
  const userMessage = JSON.stringify({
    chartData: reportData.chartData,
    endpoint: reportData.endpoint,
    report_type: reportData.report_type,
  });

  const requestBody = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
      controller.abort();
  }, API_TIMEOUT_MS);

  const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
  });
  
  clearTimeout(timeoutId); // Clear timeout if fetch completed

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error("Malformed response from OpenAI API: No content in message");
  }

  const generatedText = data.choices[0].message.content;
  
  // Collect AI metadata only
  const metadata = {
    token_count: data.usage?.total_tokens || 0,
    prompt_tokens: data.usage?.prompt_tokens || 0,
    completion_tokens: data.usage?.completion_tokens || 0,
    model: OPENAI_MODEL
  };
  
  return { report: generatedText, metadata };
}

// Fire-and-forget logging and signaling
function logAndSignalCompletion(logPrefix: string, reportData: any, report: string, metadata: any, durationMs: number, selectedEngine: string) {
  // Fire-and-forget report_logs insert
  supabase.from("report_logs").insert({
    api_key: null,
    user_id: reportData.user_id || null,
    report_type: reportData.reportType || reportData.report_type || "standard",
    endpoint: reportData.endpoint,
    report_text: report,
    status: "success",
    duration_ms: durationMs,
    client_id: reportData.client_id || null,
    engine_used: selectedEngine,
    metadata: metadata,
    is_guest: reportData.is_guest || false,
    created_at: new Date().toISOString(),
  }, { returning: "minimal" })
  .then(null, (err) => {
    // Silently fail on insert
  });
  
  // Fire-and-forget report_ready_signals insert for guest reports
  if (reportData.is_guest && reportData.user_id) {
    supabase.from('report_ready_signals').insert({
      guest_report_id: reportData.user_id
    }, { returning: "minimal" })
    .then(null, (err) => {
      // Silently fail on insert
    });
  }
}

// Main handler function
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8); // Short unique ID for this request
  const logPrefix = `[standard-report-two][${requestId}]`;
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: CORS_HEADERS });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" }
    );
  }

  const reportData = await req.json();
  
  // Warm-up check
  if (reportData?.warm === true) {
    return new Response("Warm-up", { status: 200, headers: CORS_HEADERS });
  }
  
  // Extract the report type and selected engine from the payload
  const reportType = reportData.reportType || reportData.report_type || "standard";
  const selectedEngine = reportData.selectedEngine || "standard-report-two";

  // ✅ LOGGING: Initial request received
  console.log(`${logPrefix} Request received:`, {
    report_type: reportType,
    user_id: reportData.user_id,
    endpoint: reportData.endpoint,
    is_guest: reportData.is_guest
  });

  // Fetch the system prompt using the dynamic report type
  const systemPrompt = await getSystemPrompt(reportType, requestId);
  
  // ✅ LOGGING: System prompt fetched successfully
  console.log(`${logPrefix} System prompt fetched for report type: ${reportType}`);

  // Generate the report
  const { report, metadata } = await generateReport(systemPrompt, reportData, requestId);
  
  // ✅ LOGGING: OpenAI API call completed
  console.log(`${logPrefix} OpenAI API completed:`, {
    report_type: reportType,
    user_id: reportData.user_id,
    metadata: metadata,
    duration_ms: Date.now() - startTime
  });
  
  // Log successful report generation (fire-and-forget)
  const durationMs = Date.now() - startTime;
  logAndSignalCompletion(logPrefix, reportData, report, metadata, durationMs, selectedEngine);
  
  // ✅ LOGGING: Final response being sent
  console.log(`${logPrefix} Request processing complete. Sending success response.`);
  
  // Return the generated report with proper structure
  return jsonResponse({
    success: true,
    report: {
      title: `${reportType} ${reportData.endpoint} Report`,
      content: report,
      generated_at: new Date().toISOString(),
      engine_used: selectedEngine
    },
    requestId
  });
});
