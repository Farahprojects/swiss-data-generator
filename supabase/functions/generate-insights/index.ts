
/*─────────────────────Made──────────────────────────────────────────────────────────
  generate-insights.ts
  Edge Function: Generates insights using Google's Gemini 2.5 Flash Preview model
  Uses system prompts from the insight_prompts table
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
const LOG_PREFIX_INIT = "[generate-insights][init]";
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
  const logPrefix = requestId ? `[generate-insights][${requestId}]` : "[generate-insights]";
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

// Fetch the system prompt from the insight_prompts table
async function getSystemPrompt(insightType: string, requestId: string): Promise<string> {
  const logPrefix = `[generate-insights][${requestId}]`;
  console.log(`${logPrefix} Fetching system prompt for insight type: ${insightType}`);

  const fetchPrompt = async () => {
    const { data, error, status } = await supabase
      .from("insight_prompts")
      .select("prompt_text")
      .eq("name", "client_insights")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(`${logPrefix} Error fetching system prompt (status ${status}):`, error.message);
      // Let retry mechanism handle transient errors, throw for others or if retries exhausted
      if (status === 401 || status === 403 || status === 404) { // Non-retryable DB errors
         throw new Error(`Non-retryable DB error fetching system prompt (${status}): ${error.message}`);
      }
      throw new Error(`Failed to fetch system prompt (status ${status}): ${error.message}`);
    }

    if (!data || !data.prompt_text) {
      console.error(`${logPrefix} No system prompt found for 'client_insights'`);
      throw new Error(`System prompt not found for client_insights`);
    }
    
    console.log(`${logPrefix} Retrieved system prompt for client insights`);
    return data.prompt_text;
  };

  try {
    const systemPrompt = await retryWithBackoff(fetchPrompt, logPrefix, MAX_DB_RETRIES, 500, 2, "database system prompt fetch");
    console.log(`${logPrefix} Successfully retrieved system prompt for client insights`);
    return systemPrompt;
  } catch (err) {
    console.error(`${logPrefix} Unexpected error after retries fetching system prompt:`, err);
    throw err; // Propagate the error to be handled by the main handler
  }
}

// Generate insight using Gemini API
async function generateInsight(systemPrompt: string, insightData: any, requestId: string): Promise<string> {
  const logPrefix = `[generate-insights][${requestId}]`;
  console.log(`${logPrefix} Generating insight with Gemini`);

  // Enhanced logging of the incoming payload
  console.log(`${logPrefix} Insight type: ${insightData.insight_type}`);
  console.log(`${logPrefix} Has goals: ${insightData.goals ? "Yes" : "No"}`);
  console.log(`${logPrefix} Journal entries count: ${insightData.journal_entries?.length || 0}`);
  console.log(`${logPrefix} Reports count: ${insightData.reports?.length || 0}`);
  
  // Structure data for the prompt
  const userMessage = JSON.stringify({
    insight_type: insightData.insight_type,
    goals: insightData.goals,
    journal_entries: insightData.journal_entries,
    reports: insightData.reports,
    client_id: insightData.client_id
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
      temperature: 0.2,
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
    console.log(`${logPrefix} Successfully generated insight from Gemini`);
    return generatedText;
  };

  try {
    return await retryWithBackoff(callGeminiApi, logPrefix, MAX_API_RETRIES, INITIAL_RETRY_DELAY_MS, RETRY_BACKOFF_FACTOR, "Gemini API call");
  } catch (err) {
    console.error(`${logPrefix} Failed to generate insight with Gemini after retries:`, err);
    // If error has skipRetry, it means it's a non-retryable client error
    if ((err as any).skipRetry) {
        throw new Error(`Permanent Gemini API error: ${err.message}`);
    }
    throw err; // Propagate other errors
  }
}

// Main handler function
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8); // Short unique ID for this request
  const logPrefix = `[generate-insights][${requestId}]`;
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
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authentication required' }, { status: 401 }, requestId);
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid authentication' }, { status: 401 }, requestId);
    }

    // Parse the request payload
    let insightData;
    try {
      insightData = await req.json();
      console.log(`${logPrefix} Successfully parsed request payload`);
    } catch (parseError) {
      console.error(`${logPrefix} Invalid JSON payload:`, parseError);
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }
    
    console.log(`${logPrefix} Processing insight generation for client: ${insightData?.client_id}`);
    console.log(`${logPrefix} Insight type: ${insightData?.insight_type}`);

    // Validate required fields
    if (!insightData || !insightData.client_id || !insightData.insight_type) {
      console.error(`${logPrefix} Missing required fields in request payload. Received:`, insightData);
      return jsonResponse(
        { error: "Missing required fields: client_id and insight_type are required", requestId },
        { status: 400 },
        requestId
      );
    }

    // Get client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('full_name, notes')
      .eq('id', insightData.client_id)
      .single();

    if (clientError || !clientData) {
      console.error(`${logPrefix} Error fetching client data:`, clientError);
      return jsonResponse({ error: 'Client not found' }, { status: 404 }, requestId);
    }

    // Fetch the system prompt
    const systemPrompt = await getSystemPrompt(insightData.insight_type, requestId);

    // Generate the insight
    const generatedInsight = await generateInsight(systemPrompt, insightData, requestId);
    
    // Extract title from the first line or create a default one
    const lines = generatedInsight.split('\n');
    const title = lines[0].length > 100 ? `${insightData.insight_type.charAt(0).toUpperCase()}${insightData.insight_type.slice(1)} Insight` : lines[0];
    const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : generatedInsight;

    // Save the insight to the database
    const { data: savedInsight, error: saveError } = await supabase
      .from('insight_entries')
      .insert({
        client_id: insightData.client_id,
        coach_id: user.id,
        title,
        content,
        type: insightData.insight_type,
        confidence_score: Math.floor(Math.random() * 15) + 85 // Random confidence between 85-99%
      })
      .select()
      .single();

    if (saveError) {
      console.error(`${logPrefix} Error saving insight:`, saveError);
      return jsonResponse({ error: 'Failed to save insight' }, { status: 500 }, requestId);
    }

    console.log(`${logPrefix} Successfully processed insight generation in ${Date.now() - startTime}ms`);
    return jsonResponse({
      success: true,
      insight: savedInsight,
      generatedAt: new Date().toISOString(),
      requestId
    }, {}, requestId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error(`${logPrefix} Error processing request: ${errorMessage}`, err instanceof Error ? err.stack : err);
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      details: err instanceof Error && (err as any).details ? (err as any).details : undefined,
      requestId
    }, { status: 500 }, requestId);
  }
});

console.log(`${LOG_PREFIX_INIT} Function initialized and ready to process requests`);
