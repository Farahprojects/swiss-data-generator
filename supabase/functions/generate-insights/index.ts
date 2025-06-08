
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";

const MAX_API_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_FACTOR = 2;
const API_TIMEOUT_MS = 90000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const GOOGLE_MODEL = "gemini-2.5-flash-preview-04-17";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

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
        throw error;
      }
      const jitter = delay * 0.2 * (Math.random() > 0.5 ? 1 : -1);
      const actualDelay = Math.max(0, delay + jitter);
      console.log(`${logPrefix} Retrying ${operationName} in ${actualDelay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      delay *= backoffFactor;
    }
  }
  throw new Error(`${logPrefix} Retry logic error for ${operationName}: exceeded max attempts without throwing.`);
}

async function getInsightPrompt(insightType: string, requestId: string): Promise<string> {
  const logPrefix = `[generate-insights][${requestId}]`;
  console.log(`${logPrefix} Fetching insight prompt for type: ${insightType}`);

  const fetchPrompt = async () => {
    const { data, error, status } = await supabase
      .from("insight_prompts")
      .select("prompt_text")
      .eq("name", insightType)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(`${logPrefix} Error fetching insight prompt (status ${status}):`, error.message);
      throw new Error(`Failed to fetch insight prompt (status ${status}): ${error.message}`);
    }

    if (!data || !data.prompt_text) {
      console.error(`${logPrefix} No insight prompt found for '${insightType}'`);
      throw new Error(`Insight prompt not found for ${insightType}`);
    }
    
    console.log(`${logPrefix} Retrieved insight prompt for '${insightType}'`);
    return data.prompt_text;
  };

  try {
    const prompt = await retryWithBackoff(fetchPrompt, logPrefix, 2, 500, 2, "database insight prompt fetch");
    console.log(`${logPrefix} Successfully retrieved insight prompt for ${insightType}`);
    return prompt;
  } catch (err) {
    console.error(`${logPrefix} Unexpected error after retries fetching insight prompt:`, err);
    throw err;
  }
}

async function generateInsight(systemPrompt: string, clientData: any, requestId: string): Promise<string> {
  const logPrefix = `[generate-insights][${requestId}]`;
  console.log(`${logPrefix} Generating insight with Gemini`);

  const userMessage = JSON.stringify({
    clientData: clientData,
    ...clientData
  });

  console.log(`${logPrefix} Calling Gemini API with model: ${GOOGLE_MODEL}`);

  const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;

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
      temperature: 0.3,
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
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`Gemini API call aborted due to timeout (${API_TIMEOUT_MS}ms)`);
        }
        throw fetchError;
    }
    
    clearTimeout(timeoutId);

    console.log(`${logPrefix} Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} Gemini API error response: ${response.status} - ${errorText}`);
      const error = new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
    if ((err as any).skipRetry) {
        throw new Error(`Permanent Gemini API error: ${err.message}`);
    }
    throw err;
  }
}

async function saveInsightEntry(
  clientId: string,
  coachId: string,
  title: string,
  content: string,
  type: string,
  confidenceScore: number,
  requestId: string
): Promise<string> {
  const logPrefix = `[generate-insights][${requestId}]`;
  console.log(`${logPrefix} Saving insight entry to database`);

  const { data, error } = await supabase
    .from("insight_entries")
    .insert({
      client_id: clientId,
      coach_id: coachId,
      title: title,
      content: content,
      type: type,
      confidence_score: confidenceScore
    })
    .select('id')
    .single();

  if (error) {
    console.error(`${logPrefix} Error saving insight entry:`, error);
    throw new Error(`Failed to save insight entry: ${error.message}`);
  }

  console.log(`${logPrefix} Successfully saved insight entry with ID: ${data.id}`);
  return data.id;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const logPrefix = `[generate-insights][${requestId}]`;
  const startTime = Date.now();

  console.log(`${logPrefix} Received ${req.method} request for ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log(`${logPrefix} Handling OPTIONS request (CORS preflight)`);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    console.warn(`${logPrefix} Method not allowed: ${req.method}`);
    return jsonResponse(
      { error: "Method not allowed", requestId },
      { status: 405 },
      requestId
    );
  }

  try {
    let payload;
    try {
      payload = await req.json();
      console.log(`${logPrefix} Successfully parsed request payload`);
    } catch (parseError) {
      console.error(`${logPrefix} Invalid JSON payload:`, parseError);
      return jsonResponse(
        { error: "Invalid JSON payload", details: parseError.message, requestId },
        { status: 400 },
        requestId
      );
    }

    const { clientId, coachId, insightType, clientData, title, apiKey, userId } = payload;

    if (!clientId || !coachId || !insightType || !clientData || !title) {
      console.error(`${logPrefix} Missing required fields in request payload`);
      return jsonResponse(
        { error: "Missing required fields: clientId, coachId, insightType, clientData, and title are required", requestId },
        { status: 400 },
        requestId
      );
    }

    // Fetch the insight prompt
    const systemPrompt = await getInsightPrompt(insightType, requestId);

    // Generate the insight
    const insightContent = await generateInsight(systemPrompt, clientData, requestId);

    // Save the insight entry
    const insightId = await saveInsightEntry(
      clientId,
      coachId,
      title,
      insightContent,
      insightType,
      85, // Default confidence score
      requestId
    );

    // Record API usage if we have the necessary data
    if (apiKey && userId) {
      try {
        const { error: usageError } = await supabase.rpc('record_api_usage', {
          _user_id: userId,
          _endpoint: 'generate-insights',
          _cost_usd: 7.50,
          _request_params: { insightType, clientId },
          _response_status: 200,
          _processing_time_ms: Date.now() - startTime
        });

        if (usageError) {
          console.error(`${logPrefix} Error recording API usage:`, usageError);
        }
      } catch (usageErr) {
        console.error(`${logPrefix} Failed to record API usage:`, usageErr);
      }
    }

    console.log(`${logPrefix} Successfully processed insight request in ${Date.now() - startTime}ms`);
    return jsonResponse({
      success: true,
      insightId: insightId,
      content: insightContent,
      requestId
    }, {}, requestId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error(`${logPrefix} Error processing request: ${errorMessage}`, err instanceof Error ? err.stack : err);
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      requestId
    }, { status: 500 }, requestId);
  }
});

console.log(`[generate-insights][init] Function initialized and ready to process requests`);
