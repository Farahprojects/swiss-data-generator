
/*─────────────────────Made──────────────────────────────────────────────────────────
  standard-report-two 
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
const MAX_API_RETRIES = parseInt(Deno.env.get("MAX_API_RETRIES") || "3");
const INITIAL_RETRY_DELAY_MS = parseInt(Deno.env.get("INITIAL_RETRY_DELAY_MS") || "1000");
const RETRY_BACKOFF_FACTOR = parseFloat(Deno.env.get("RETRY_BACKOFF_FACTOR") || "2");
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000"); 
const MAX_DB_RETRIES = parseInt(Deno.env.get("MAX_DB_RETRIES") || "2");

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
      return await fn();
    } catch (error) {
      // Return early on non-retryable errors
      if ((error as any).skipRetry) {
        throw error;
      }
      if (attempts >= maxAttempts) {
        throw error; // Re-throw the last error
      }
      // Add jitter: delay +/- 20% of delay
      const jitter = delay * 0.2 * (Math.random() > 0.5 ? 1 : -1);
      const actualDelay = Math.max(0, delay + jitter); // Ensure delay is not negative
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      delay *= backoffFactor;
    }
  }
  // This line should theoretically be unreachable due to the throw in the catch block
  throw new Error(`${logPrefix} Retry logic error for ${operationName}: exceeded max attempts without throwing.`);
}

// Fetch the system prompt from the reports_prompts table - now accepts reportType parameter
async function getSystemPrompt(reportType: string, requestId: string): Promise<string> {
  const logPrefix = `[standard-report-one][${requestId}]`;

  // 1. Check cache first
  if (promptCache.has(reportType)) {
    console.log(`${logPrefix} Cache HIT for system prompt: ${reportType}`);
    return promptCache.get(reportType)!;
  }
  
  console.log(`${logPrefix} Cache MISS for system prompt: ${reportType}. Fetching from DB.`);

  try {
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
    console.log(`${logPrefix} Stored system prompt in cache: ${reportType}`);
    
    return data.system_prompt;
  } catch (err) {
    console.error(`${logPrefix} Critical error fetching system prompt:`, err.message);
    throw err; // Propagate the error to be handled by the main handler
  }
}

// Generate report using OpenAI API
async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<{ report: string; metadata: any }> {
  const logPrefix = `[standard-report][${requestId}]`;

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

  const callOpenAIApi = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, API_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(OPENAI_ENDPOINT, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    } catch (fetchError) {
        // This catch is primarily for network errors or if AbortController aborts
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`OpenAI API call aborted due to timeout (${API_TIMEOUT_MS}ms)`);
        }
        throw fetchError; // Re-throw other fetch errors
    }
    
    clearTimeout(timeoutId); // Clear timeout if fetch completed

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      // Add status to error object for potential specific handling in retry logic if needed
      (error as any).status = response.status;
      // Do not retry on 400 (bad request) or 404 (model not found) as they are likely permanent for this request
      if (response.status === 400 || response.status === 404 || response.status === 401 || response.status === 403) {
        throw Object.assign(error, { skipRetry: true });
      }
      throw error;
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
  };

  try {
    return await retryWithBackoff(callOpenAIApi, logPrefix, MAX_API_RETRIES, INITIAL_RETRY_DELAY_MS, RETRY_BACKOFF_FACTOR, "OpenAI API call");
  } catch (err) {
    // If error has skipRetry, it means it's a non-retryable client error
    if ((err as any).skipRetry) {
        throw new Error(`Permanent OpenAI API error: ${err.message}`);
    }
    throw err; // Propagate other errors
  }
}

// Fire-and-forget logging and signaling
function logAndSignalCompletion(logPrefix: string, reportData: any, report: string, metadata: any, durationMs: number, selectedEngine: string) {
  // Fire-and-forget report_logs insert
  supabase.from("report_logs").insert({
    user_id: reportData.user_id || null,
    report_type: reportData.reportType || reportData.report_type || "standard",
    endpoint: reportData.endpoint,
    report_text: report,
    status: "success",
    duration_ms: durationMs,
    engine_used: selectedEngine,
    metadata: metadata,
    is_guest: reportData.is_guest || false,
    created_at: new Date().toISOString(),
  })
  .then(() => console.log(`${logPrefix} Report log insert succeeded for ${reportData.is_guest ? 'guest' : 'user'} report`))
  .catch(err => console.error(`${logPrefix} Report log insert failed:`, {
    error: err,
    user_id: reportData.user_id,
    is_guest: reportData.is_guest,
    report_type: reportData.reportType || reportData.report_type
  }));
  
  // Fire-and-forget report_ready_signals insert for guest reports
  if (reportData.is_guest && reportData.user_id) {
    supabase.from('report_ready_signals').insert({
      guest_report_id: reportData.user_id
    })
    .then(() => console.log(`${logPrefix} Signal inserted for guest report: ${reportData.user_id}`))
    .catch(err => console.error(`${logPrefix} Signal insert failed:`, err));
  }
}

// Logging is now handled by the orchestrator

// Main handler function
serve(async (req) => {
  let reportData: any; // Define here to be accessible in catch block
  const requestId = crypto.randomUUID().substring(0, 8); // Short unique ID for this request
  const logPrefix = `[standard-report-one][${requestId}]`;
  const startTime = Date.now();

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
    try {
      reportData = await req.json();
      
      // Warm-up check
      if (reportData?.warm === true) {
        return new Response("Warm-up", { status: 200, headers: CORS_HEADERS });
      }
    } catch (parseError) {
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }
    
    // Extract the report type and selected engine from the payload
    const reportType = reportData.reportType || reportData.report_type || "standard";
    const selectedEngine = reportData.selectedEngine || "standard-report"; // Fall back to default if not provided

    // ✅ LOGGING: Initial request received
    console.log(`${logPrefix} Request received:`, {
      report_type: reportType,
      user_id: reportData.user_id,
      endpoint: reportData.endpoint,
      is_guest: reportData.is_guest
    });

    // Validate required fields
    if (!reportData || !reportData.chartData || !reportData.endpoint) {
      console.error(`${logPrefix} Validation failed: Missing required fields`);
      return jsonResponse(
        { error: "Missing required fields: chartData and endpoint are required", requestId },
        { status: 400 },
        requestId
      );
    }

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
    }, {}, requestId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    
    // ✅ LOGGING: Main handler error
    console.error(`${logPrefix} Main handler error:`, {
      report_type: reportData?.reportType || reportData?.report_type,
      user_id: reportData?.user_id,
      error: errorMessage,
      duration_ms: Date.now() - startTime
    });
    
    // Log error to report_logs
    const durationMs = Date.now() - startTime;
    try {
      supabase.from("report_logs").insert({
        user_id: reportData?.user_id || null,
        report_type: reportData?.reportType || reportData?.report_type || null,
        endpoint: reportData?.endpoint || null,
        report_text: null,
        status: "error",
        error_message: errorMessage,
        duration_ms: durationMs,
        engine_used: reportData?.selectedEngine || "standard-report",
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.error(`${logPrefix} Error report log insert failed:`, {
            report_type: reportData?.reportType || reportData?.report_type,
            user_id: reportData?.user_id,
            error: error
          });
        }
      });
    } catch (logErr) {
      // ✅ LOGGING: Error report log insert exception
      console.error(`${logPrefix} Error report log insert exception:`, {
        report_type: reportData?.reportType || reportData?.report_type,
        user_id: reportData?.user_id,
        error: logErr
      });
    }
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      details: err instanceof Error && (err as any).details ? (err as any).details : undefined,
      requestId
    }, { status: 500 }, requestId);
  }
});
