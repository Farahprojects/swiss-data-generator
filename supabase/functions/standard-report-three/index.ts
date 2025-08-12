
/*─────────────────────Made──────────────────────────────────────────────────────────
  standard-report-three.ts
  Edge Function: Generates standard reports using Google's Gemini 2.5 Flash Preview model
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
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";

// Production Readiness Configuration
const MAX_API_RETRIES = parseInt(Deno.env.get("MAX_API_RETRIES") || "3");
const INITIAL_RETRY_DELAY_MS = parseInt(Deno.env.get("INITIAL_RETRY_DELAY_MS") || "1000");
const RETRY_BACKOFF_FACTOR = parseFloat(Deno.env.get("RETRY_BACKOFF_FACTOR") || "2");
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000"); 
const MAX_DB_RETRIES = parseInt(Deno.env.get("MAX_DB_RETRIES") || "2");

// Enhanced debugging for initialization
const LOG_PREFIX_INIT = "[standard-report-three][init]";
console.log(`${LOG_PREFIX_INIT} Edge function initializing with config:
- SUPABASE_URL: ${SUPABASE_URL ? "Exists (first 10 chars): " + SUPABASE_URL.substring(0, 10) + "..." : "MISSING"}
- SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "Exists (length: " + SUPABASE_SERVICE_KEY.length + ")" : "MISSING"}
- GOOGLE_API_KEY: ${GOOGLE_API_KEY ? "Exists (length: " + GOOGLE_API_KEY.length + ", starts with: " + GOOGLE_API_KEY.substring(0, 4) + "...)" : "MISSING"}
- MAX_API_RETRIES: ${MAX_API_RETRIES}
- INITIAL_RETRY_DELAY_MS: ${INITIAL_RETRY_DELAY_MS}
- RETRY_BACKOFF_FACTOR: ${RETRY_BACKOFF_FACTOR}
- API_TIMEOUT_MS: ${API_TIMEOUT_MS}
- MAX_DB_RETRIES: ${MAX_DB_RETRIES}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(`${LOG_PREFIX_INIT} Missing required Supabase environment variables`);
  throw new Error("Missing required Supabase environment variables");
}

if (!GOOGLE_API_KEY) {
  console.error(`${LOG_PREFIX_INIT} Missing Google API key`);
  throw new Error("Missing Google API key");
}

// Initialize Supabase client
let supabase: SupabaseClient;
try {
  console.log(`${LOG_PREFIX_INIT} Creating Supabase client...`);
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`${LOG_PREFIX_INIT} Supabase client created successfully`);
} catch (err) {
  console.error(`${LOG_PREFIX_INIT} Failed to create Supabase client:`, err);
  throw err;
}

const GOOGLE_MODEL = "gemini-2.5-flash-preview-04-17";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

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
function jsonResponse(body: unknown, init: ResponseInit = {}, requestId?: string): Response {
  const logPrefix = requestId ? `[standard-report-three][${requestId}]` : "[standard-report-three]";
  if (init.status && init.status >= 400) {
    console.error(`${logPrefix} Sending error response: ${init.status}`, body);
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  logPrefix: string,
  maxAttempts = MAX_API_RETRIES,
  initialDelayMs = INITIAL_RETRY_DELAY_MS,
  backoffFactor = RETRY_BACKOFF_FACTOR,
  operationName = "API call"
): Promise<T> {
  let attempts = 0;
  let delay = initialDelayMs;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`${logPrefix} Attempt ${attempts}/${maxAttempts} for ${operationName}...`);
      return await fn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`${logPrefix} Attempt ${attempts}/${maxAttempts} for ${operationName} failed: ${errorMessage}.`);
      if (attempts >= maxAttempts) {
        console.error(`${logPrefix} All ${maxAttempts} attempts for ${operationName} failed. Last error:`, error);
        throw error; // Re-throw the last error
      }
      // Add jitter: delay +/- 20% of delay
      const jitter = delay * 0.2 * (Math.random() > 0.5 ? 1 : -1);
      const actualDelay = Math.max(0, delay + jitter); // Ensure delay is not negative
      console.log(`${logPrefix} Retrying ${operationName} in ${actualDelay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      delay *= backoffFactor;
    }
  }
  // This line should theoretically be unreachable due to the throw in the catch block
  throw new Error(`${logPrefix} Retry logic error for ${operationName}: exceeded max attempts without throwing.`);
}

// Fetch the system prompt from the reports_prompts table - now accepts reportType parameter
async function getSystemPrompt(reportType: string, requestId: string): Promise<string> {
  const logPrefix = `[standard-report-three][${requestId}]`;
  
  // 1. Check cache first
  if (promptCache.has(reportType)) {
    console.log(`${logPrefix} Cache HIT for system prompt: ${reportType}`);
    return promptCache.get(reportType)!;
  }
  
  console.log(`${logPrefix} Cache MISS for system prompt: ${reportType}. Fetching from DB.`);
  console.log(`${logPrefix} Fetching system prompt for report type: ${reportType}`);

  const fetchPrompt = async () => {
    const { data, error, status } = await supabase
      .from("report_prompts")
      .select("system_prompt")
      .eq("name", reportType) // Changed from hardcoded "standard" to dynamic reportType
      .maybeSingle();

    if (error) {
      console.error(`${logPrefix} Error fetching system prompt (status ${status}):`, error.message);
      // Let retry mechanism handle transient errors, throw for others or if retries exhausted
      if (status === 401 || status === 403 || status === 404) { // Non-retryable DB errors
         throw new Error(`Non-retryable DB error fetching system prompt (${status}): ${error.message}`);
      }
      throw new Error(`Failed to fetch system prompt (status ${status}): ${error.message}`);
    }

    if (!data || !data.system_prompt) {
      console.error(`${logPrefix} No system prompt found for '${reportType}'`);
      throw new Error(`System prompt not found for ${reportType} report`);
    }
    
    // 2. Store in cache on successful fetch
    promptCache.set(reportType, data.system_prompt);
    console.log(`${logPrefix} Stored system prompt in cache: ${reportType}`);

    console.log(`${logPrefix} Retrieved system prompt for '${reportType}' report type`);
    return data.system_prompt;
  };

  try {
    const systemPrompt = await retryWithBackoff(fetchPrompt, logPrefix, MAX_DB_RETRIES, 500, 2, "database system prompt fetch");
    console.log(`${logPrefix} Successfully retrieved system prompt for ${reportType}`);
    return systemPrompt;
  } catch (err) {
    console.error(`${logPrefix} Unexpected error after retries fetching system prompt:`, err);
    throw err; // Propagate the error to be handled by the main handler
  }
}

// Generate report using Gemini API
async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<{ report: string; metadata: any }> {
  const logPrefix = `[standard-report-three][${requestId}]`;
  console.log(`${logPrefix} Generating report with Gemini`);

  // Enhanced logging of the incoming payload
  console.log(`${logPrefix} Report data endpoint: ${reportData.endpoint}`);
  console.log(`${logPrefix} Report data contains chartData: ${reportData.chartData ? "Yes" : "No"}`);
  
  // Structure data for the prompt. The AI will get the full chartData.
  const userMessage = JSON.stringify({
    chartData: reportData.chartData,
    endpoint: reportData.endpoint,
    report_type: reportData.report_type,
  });
  
  console.log(`${logPrefix} Calling Gemini API with model: ${GOOGLE_MODEL}`);
  console.log(`${logPrefix} API Key format check: ${GOOGLE_API_KEY.length > 20 ? "Valid length" : "Invalid length"}`);

  const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;
  console.log(`${logPrefix} Target API URL (without key): ${GOOGLE_ENDPOINT}`);

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: userMessage }
        ]
      }
    ],
    generationConfig: {
      
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };

  const callGeminiApi = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`${logPrefix} Gemini API call timed out after ${API_TIMEOUT_MS}ms`);
    }, API_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    } catch (fetchError) {
        // This catch is primarily for network errors or if AbortController aborts
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`Gemini API call aborted due to timeout (${API_TIMEOUT_MS}ms)`);
        }
        throw fetchError; // Re-throw other fetch errors
    }
    
    clearTimeout(timeoutId); // Clear timeout if fetch completed

    console.log(`${logPrefix} Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} Gemini API error response: ${response.status} - ${errorText}`);
      const error = new Error(`Gemini API error: ${response.status} - ${errorText}`);
      // Add status to error object for potential specific handling in retry logic if needed
      (error as any).status = response.status;
      // Do not retry on 400 (bad request) or 404 (model not found) as they are likely permanent for this request
      if (response.status === 400 || response.status === 404 || response.status === 401 || response.status === 403) {
        throw Object.assign(error, { skipRetry: true });
      }
      throw error;
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error(`${logPrefix} No content or parts returned from Gemini API in candidate:`, JSON.stringify(data));
      throw new Error("Malformed response from Gemini API: No content/parts in candidate");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log(`${logPrefix} Successfully generated report from Gemini`);
    
    // Collect AI metadata only
    const metadata = {
      token_count: data.usage?.total_tokens || 0,
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      model: "gemini-pro"
    };
    
    console.log(`${logPrefix} AI Generation Metadata:`, metadata);
    return { report: generatedText, metadata };
  };

  try {
    return await retryWithBackoff(callGeminiApi, logPrefix, MAX_API_RETRIES, INITIAL_RETRY_DELAY_MS, RETRY_BACKOFF_FACTOR, "Gemini API call");
  } catch (err) {
    console.error(`${logPrefix} Failed to generate report with Gemini after retries:`, err);
    // If error has skipRetry, it means it's a non-retryable client error
    if ((err as any).skipRetry) {
        throw new Error(`Permanent Gemini API error: ${err.message}`);
    }
    throw err; // Propagate other errors
  }
}

// Logging is now handled by the orchestrator

// Main handler function
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8); // Short unique ID for this request
  const logPrefix = `[standard-report-three][${requestId}]`;
  const startTime = Date.now();

  console.log(`${logPrefix} Received ${req.method} request for ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`${logPrefix} Handling OPTIONS request (CORS preflight)`);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`${logPrefix} Method not allowed: ${req.method}`);
    return jsonResponse(
      { error: "Method not allowed", requestId },
      { status: 405 },
      requestId
    );
  }

  try {
    // Parse the request payload
    let reportData;
    try {
      reportData = await req.json();
      console.log(`${logPrefix} Successfully parsed request payload`);
    } catch (parseError) {
      console.error(`${logPrefix} Invalid JSON payload:`, parseError);
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }
    
    // Extract the report type from the payload (either reportType or report_type)
    const reportType = reportData.reportType || reportData.report_type || "standard";
    console.log(`${logPrefix} Processing ${reportType} report for endpoint: ${reportData?.endpoint}`);
    console.log(`${logPrefix} Payload structure check - keys: ${Object.keys(reportData || {}).join(', ')}`);

    // Validate required fields
    if (!reportData || !reportData.chartData || !reportData.endpoint) {
      console.error(`${logPrefix} Missing required fields in request payload. Received:`, reportData);
      
      // Field validation failed - let orchestrator handle logging
      
      return jsonResponse(
        { error: "Missing required fields: chartData and endpoint are required", requestId },
        { status: 400 },
        requestId
      );
    }

    // Fetch the system prompt using the dynamic report type
    const systemPrompt = await getSystemPrompt(reportType, requestId);

    // Generate the report
    const { report, metadata } = await generateReport(systemPrompt, reportData, requestId);
    
    // Log successful report generation (fire-and-forget)
    const durationMs = Date.now() - startTime;
    
    // Fire-and-forget report_logs insert
    supabase.from("report_logs").insert({
      api_key: null,
      user_id: reportData.user_id || null,
      report_type: reportType,
      endpoint: reportData.endpoint,
      report_text: report,
      status: "success",
      duration_ms: durationMs,
      client_id: reportData.client_id || null,
      engine_used: reportData.selectedEngine || "standard-report-three",
      metadata: metadata,
      created_at: new Date().toISOString(),
    })
    .then(() => console.log(`${logPrefix} Successfully logged report generation to report_logs.`))
    .catch(err => console.error(`${logPrefix} Failed to log success to report_logs:`, err));
    
    // Return the generated report with proper structure
    console.log(`${logPrefix} Successfully processed ${reportType} request in ${Date.now() - startTime}ms`);
    return jsonResponse({
      success: true,
      report: {
        title: `${reportType} ${reportData.endpoint} Report`,
        content: report,
        generated_at: new Date().toISOString(),
        engine_used: reportData.selectedEngine || "standard-report-three"
      },
      requestId
    }, {}, requestId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error(`${logPrefix} Error processing request: ${errorMessage}`, err instanceof Error ? err.stack : err);
    
    // Log error to report_logs (fire-and-forget)
    const durationMs = Date.now() - startTime;
    
    supabase.from("report_logs").insert({
      api_key: null,
      user_id: reportData?.user_id || null,
      report_type: reportData?.reportType || reportData?.report_type || null,
      endpoint: reportData?.endpoint || null,
      report_text: null,
      status: "error",
      error_message: errorMessage,
      duration_ms: durationMs,
      client_id: reportData?.client_id || null,
      engine_used: reportData?.selectedEngine || "standard-report-three",
      created_at: new Date().toISOString(),
    })
    .then(() => console.log(`${logPrefix} Logged error to report_logs.`))
    .catch(err => console.error(`${logPrefix} Failed to log error to report_logs:`, err));
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      details: err instanceof Error && (err as any).details ? (err as any).details : undefined,
      requestId
    }, { status: 500 }, requestId);
  }
});

console.log(`${LOG_PREFIX_INIT} Function initialized and ready to process requests`);
