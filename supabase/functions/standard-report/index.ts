
/*─────────────────────Made──────────────────────────────────────────────────────────
  standard-report.ts
  Edge Function: Generates standard reports using Google's Gemini 2.5 Flash Preview model
  Uses system prompts from the reports_prompts table
  Enhanced for production readiness with retries, timeouts, and structured logging.
────────────────────────────────────────────────────────────────────────────────*/
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch polyfill for Edge runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "90000"); 
const MAX_DB_RETRIES = parseInt(Deno.env.get("MAX_DB_RETRIES") || "2");


// Enhanced debugging for initialization
const LOG_PREFIX_INIT = "[standard-report][init]";
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
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log(`${LOG_PREFIX_INIT} Supabase client created successfully`);
} catch (err) {
  console.error(`${LOG_PREFIX_INIT} Failed to create Supabase client:`, err);
  throw err;
}

const GOOGLE_MODEL = "gemini-2.5-flash-preview-04-17";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

// CORS headers for cross-domain requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/*───────────────────────────────────────────────────────────────────────────────
  UTILS
────────────────────────────────────────────────────────────────────────────────*/
function jsonResponse(body: unknown, init: ResponseInit = {}, requestId?: string): Response {
  const logPrefix = requestId ? `[standard-report][${requestId}]` : "[standard-report]";
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

// Fetch the system prompt from the reports_prompts table
async function getSystemPrompt(requestId: string): Promise<string> {
  const logPrefix = `[standard-report][${requestId}]`;
  console.log(`${logPrefix} Fetching system prompt from database`);

  const fetchPrompt = async () => {
    const { data, error, status } = await supabase
      .from("report_prompts")
      .select("system_prompt")
      .eq("name", "standard")
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
      console.error(`${logPrefix} No system prompt found for 'standard'`);
      throw new Error("System prompt not found for standard report");
    }
    
    console.log(`${logPrefix} Retrieved system prompt for 'standard' report type`);
    return data.system_prompt;
  };

  try {
    const systemPrompt = await retryWithBackoff(fetchPrompt, logPrefix, MAX_DB_RETRIES, 500, 2, "database system prompt fetch");
    console.log(`${logPrefix} Successfully retrieved system prompt`);
    return systemPrompt;
  } catch (err) {
    console.error(`${logPrefix} Unexpected error after retries fetching system prompt:`, err);
    throw err; // Propagate the error to be handled by the main handler
  }
}

// Generate report using Gemini API
async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<string> {
  const logPrefix = `[standard-report][${requestId}]`;
  console.log(`${logPrefix} ==> Starting report generation with Gemini`);

  // DETAILED LOGGING: Log the incoming payload structure
  console.log(`${logPrefix} ==> Report data analysis:`);
  console.log(`${logPrefix} ==> - endpoint: ${reportData.endpoint}`);
  console.log(`${logPrefix} ==> - chartData present: ${reportData.chartData ? "YES" : "NO"}`);
  console.log(`${logPrefix} ==> - chartData type: ${typeof reportData.chartData}`);
  if (reportData.chartData) {
    console.log(`${logPrefix} ==> - chartData keys: ${Object.keys(reportData.chartData).join(", ")}`);
    console.log(`${logPrefix} ==> - chartData sample: ${JSON.stringify(reportData.chartData).substring(0, 200)}...`);
  }
  console.log(`${logPrefix} ==> - report_type: ${reportData.report_type || "unknown"}`);
  console.log(`${logPrefix} ==> - user_id: ${reportData.user_id || "unknown"}`);
  console.log(`${logPrefix} ==> - apiKey present: ${reportData.apiKey ? "YES" : "NO"}`);
  
  // Structure data for the prompt
  const userMessage = JSON.stringify({
    chartData: reportData.chartData,
    endpoint: reportData.endpoint,
    ...reportData // Include any other relevant data
  });

  console.log(`${logPrefix} ==> User message length: ${userMessage.length} characters`);
  console.log(`${logPrefix} ==> Calling Gemini API with model: ${GOOGLE_MODEL}`);
  console.log(`${logPrefix} ==> API Key format check: ${GOOGLE_API_KEY.length > 20 ? "Valid length" : "Invalid length"}`);

  const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;
  console.log(`${logPrefix} ==> Target API URL (without key): ${GOOGLE_ENDPOINT}`);

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
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };

  console.log(`${logPrefix} ==> Request body structure:`, {
    contentsLength: requestBody.contents.length,
    partsLength: requestBody.contents[0].parts.length,
    systemPromptLength: systemPrompt.length,
    userMessageLength: userMessage.length,
    generationConfig: requestBody.generationConfig
  });

  const callGeminiApi = async () => {
    console.log(`${logPrefix} ==> Making actual API call to Gemini...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`${logPrefix} ==> Gemini API call timed out after ${API_TIMEOUT_MS}ms`);
    }, API_TIMEOUT_MS);

    let response;
    try {
        console.log(`${logPrefix} ==> Sending request to Gemini API...`);
        response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
        console.log(`${logPrefix} ==> Received response from Gemini API`);
    } catch (fetchError) {
        // This catch is primarily for network errors or if AbortController aborts
        clearTimeout(timeoutId);
        console.error(`${logPrefix} ==> Fetch error:`, fetchError);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`Gemini API call aborted due to timeout (${API_TIMEOUT_MS}ms)`);
        }
        throw fetchError; // Re-throw other fetch errors
    }
    
    clearTimeout(timeoutId); // Clear timeout if fetch completed

    console.log(`${logPrefix} ==> Gemini API response status: ${response.status}`);
    console.log(`${logPrefix} ==> Gemini API response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} ==> Gemini API error response: ${response.status} - ${errorText}`);
      const error = new Error(`Gemini API error: ${response.status} - ${errorText}`);
      // Add status to error object for potential specific handling in retry logic if needed
      (error as any).status = response.status;
      // Do not retry on 400 (bad request) or 404 (model not found) as they are likely permanent for this request
      if (response.status === 400 || response.status === 404 || response.status === 401 || response.status === 403) {
        throw Object.assign(error, { skipRetry: true });
      }
      throw error;
    }

    console.log(`${logPrefix} ==> Parsing Gemini API response...`);
    const data = await response.json();
    console.log(`${logPrefix} ==> Gemini API response structure:`, {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
      hasContent: data.candidates?.[0]?.content ? "YES" : "NO",
      hasParts: data.candidates?.[0]?.content?.parts ? "YES" : "NO",
      partsLength: data.candidates?.[0]?.content?.parts?.length || 0
    });

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error(`${logPrefix} ==> No content or parts returned from Gemini API in candidate:`, JSON.stringify(data));
      throw new Error("Malformed response from Gemini API: No content/parts in candidate");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log(`${logPrefix} ==> Successfully generated report from Gemini (length: ${generatedText.length} characters)`);
    console.log(`${logPrefix} ==> Generated report preview: ${generatedText.substring(0, 150)}...`);
    return generatedText;
  };

  try {
    console.log(`${logPrefix} ==> Starting Gemini API call with retry logic...`);
    const result = await retryWithBackoff(callGeminiApi, logPrefix, MAX_API_RETRIES, INITIAL_RETRY_DELAY_MS, RETRY_BACKOFF_FACTOR, "Gemini API call");
    console.log(`${logPrefix} ==> Report generation completed successfully`);
    return result;
  } catch (err) {
    console.error(`${logPrefix} ==> Failed to generate report with Gemini after retries:`, err);
    console.error(`${logPrefix} ==> Error stack:`, err instanceof Error ? err.stack : "No stack trace");
    // If error has skipRetry, it means it's a non-retryable client error
    if ((err as any).skipRetry) {
        throw new Error(`Permanent Gemini API error: ${err.message}`);
    }
    throw err; // Propagate other errors
  }
}

// Log report generation attempt to the report_logs table
async function logReportAttempt(
  apiKey: string,
  userId: string,
  reportType: string,
  endpoint: string,
  swissPayload: any,
  reportText: string | null,
  status: string,
  durationMs: number,
  errorMessage: string | null,
  requestId: string
) {
  const logPrefix = `[standard-report][${requestId}]`;
  try {
    console.log(`${logPrefix} Logging report attempt to report_logs table`);
    
    const { error } = await supabase.from("report_logs").insert({
      api_key: apiKey,
      user_id: userId,
      report_type: reportType,
      endpoint: endpoint,
      swiss_payload: swissPayload,
      report_text: reportText,
      status: status,
      duration_ms: durationMs,
      error_message: errorMessage
    });
    
    if (error) {
      console.error(`${logPrefix} Error logging report attempt: ${error.message}`);
    } else {
      console.log(`${logPrefix} Successfully logged ${status} report attempt for user ${userId}`);
    }
  } catch (err) {
    console.error(`${logPrefix} Failed to log report attempt: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Main handler function
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8); // Short unique ID for this request
  const logPrefix = `[standard-report][${requestId}]`;
  const startTime = Date.now();

  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} NEW REQUEST: Received ${req.method} request for ${req.url}`);
  console.log(`${logPrefix} ========================================`);

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
      console.log(`${logPrefix} Parsing request payload...`);
      reportData = await req.json();
      console.log(`${logPrefix} Successfully parsed request payload`);
      console.log(`${logPrefix} PAYLOAD RECEIVED:`, {
        hasChartData: !!reportData?.chartData,
        endpoint: reportData?.endpoint,
        reportType: reportData?.report_type,
        userId: reportData?.user_id,
        hasApiKey: !!reportData?.apiKey,
        payloadKeys: Object.keys(reportData || {})
      });
    } catch (parseError) {
      console.error(`${logPrefix} Invalid JSON payload:`, parseError);
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }

    console.log(`${logPrefix} Processing report for endpoint: ${reportData?.endpoint}`);
    console.log(`${logPrefix} Payload structure check - keys: ${Object.keys(reportData || {}).join(', ')}`);

    // Validate required fields
    if (!reportData || !reportData.chartData || !reportData.endpoint) {
      console.error(`${logPrefix} VALIDATION FAILED - Missing required fields in request payload.`);
      console.error(`${logPrefix} - reportData exists: ${!!reportData}`);
      console.error(`${logPrefix} - chartData exists: ${!!reportData?.chartData}`);
      console.error(`${logPrefix} - endpoint exists: ${!!reportData?.endpoint}`);
      console.error(`${logPrefix} Full payload:`, reportData);
      
      // Log the failed attempt
      if (reportData && reportData.apiKey && reportData.user_id) {
        await logReportAttempt(
          reportData.apiKey,
          reportData.user_id,
          reportData.report_type || "standard",
          reportData.endpoint || "unknown",
          null,
          null,
          "failed",
          Date.now() - startTime,
          "Missing required fields: chartData and endpoint are required",
          requestId
        );
      }
      
      return jsonResponse(
        { error: "Missing required fields: chartData and endpoint are required", requestId },
        { status: 400 },
        requestId
      );
    }

    console.log(`${logPrefix} VALIDATION PASSED - All required fields present`);

    // Fetch the system prompt
    console.log(`${logPrefix} Fetching system prompt...`);
    const systemPrompt = await getSystemPrompt(requestId);
    console.log(`${logPrefix} System prompt retrieved successfully (length: ${systemPrompt.length})`);

    // Generate the report
    console.log(`${logPrefix} Starting report generation...`);
    const report = await generateReport(systemPrompt, reportData, requestId);
    console.log(`${logPrefix} Report generation completed successfully`);
    
    // Log successful report generation - this is now the ONLY place reports are logged
    if (reportData.apiKey && reportData.user_id) {
      console.log(`${logPrefix} Logging successful report to database...`);
      await logReportAttempt(
        reportData.apiKey,
        reportData.user_id,
        reportData.report_type || "standard",
        reportData.endpoint,
        reportData.chartData,
        report, // Make sure this contains the actual report text
        "success",
        Date.now() - startTime,
        null,
        requestId
      );
      console.log(`${logPrefix} Database logging completed`);
    }

    // Return the generated report
    console.log(`${logPrefix} Successfully processed request in ${Date.now() - startTime}ms`);
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} REQUEST COMPLETED SUCCESSFULLY`);
    console.log(`${logPrefix} ========================================`);
    return jsonResponse({
      success: true,
      report: report,
      requestId
    }, {}, requestId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error(`${logPrefix} ========================================`);
    console.error(`${logPrefix} ERROR processing request: ${errorMessage}`);
    console.error(`${logPrefix} Error details:`, err instanceof Error ? err.stack : err);
    console.error(`${logPrefix} ========================================`);
    
    // Log the failed attempt if we have user info
    if (err instanceof Error && err.cause && typeof err.cause === 'object' && err.cause !== null) {
      const payload = err.cause as any;
      if (payload.apiKey && payload.user_id) {
        await logReportAttempt(
          payload.apiKey,
          payload.user_id,
          payload.report_type || "standard",
          payload.endpoint || "unknown",
          payload.chartData,
          null,
          "failed",
          Date.now() - startTime,
          errorMessage,
          requestId
        );
      }
    }
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      details: err instanceof Error && (err as any).details ? (err as any).details : undefined,
      requestId
    }, { status: 500 }, requestId);
  }
});

console.log(`${LOG_PREFIX_INIT} Function initialized and ready to process requests`);
