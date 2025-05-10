/*───────────────────────────────────────────────────────────────────────────────
  standard-report.ts
  Edge Function: Generates standard reports using Google's Gemini 2.5 Flash Preview model
  Uses system prompts from the reports_prompts table
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

// Enhanced debugging for initialization
console.log(`[standard-report] Edge function initialized with config:
- SUPABASE_URL: ${SUPABASE_URL ? "Exists (first 10 chars): " + SUPABASE_URL.substring(0, 10) + "..." : "MISSING"}
- SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "Exists (length: " + SUPABASE_SERVICE_KEY.length + ")" : "MISSING"}
- GOOGLE_API_KEY: ${GOOGLE_API_KEY ? "Exists (length: " + GOOGLE_API_KEY.length + ", starts with: " + GOOGLE_API_KEY.substring(0, 4) + "...)" : "MISSING"}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[standard-report] Missing required Supabase environment variables");
  throw new Error("Missing required Supabase environment variables");
}

if (!GOOGLE_API_KEY) {
  console.error("[standard-report] Missing Google API key");
  throw new Error("Missing Google API key");
}

// Initialize Supabase client
let supabase: SupabaseClient;
try {
  console.log("[standard-report] Creating Supabase client...");
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("[standard-report] Supabase client created successfully");
} catch (err) {
  console.error("[standard-report] Failed to create Supabase client:", err);
  throw err;
}

const GOOGLE_MODEL = "gemini-2.5-flash-preview";
// Corrected Line: Changed "v1" to "v1beta" in the endpoint URL
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

// Fetch the system prompt from the reports_prompts table
async function getSystemPrompt(): Promise<string> {
  console.log("[standard-report] Fetching system prompt from database");
  
  try {
    const { data, error } = await supabase
      .from("report_prompts")
      .select("system_prompt")
      .eq("name", "standard")
      .maybeSingle();
    
    if (error) {
      console.error("[standard-report] Error fetching system prompt:", error.message);
      throw new Error(`Failed to fetch system prompt: ${error.message}`);
    }
    
    if (!data || !data.system_prompt) {
      console.error("[standard-report] No system prompt found for 'standard'");
      throw new Error("System prompt not found for standard report");
    }
    
    console.log("[standard-report] Successfully retrieved system prompt");
    return data.system_prompt;
  } catch (err) {
    console.error("[standard-report] Unexpected error fetching system prompt:", err);
    throw err;
  }
}

// Generate report using Gemini API
async function generateReport(systemPrompt: string, reportData: any): Promise<string> {
  console.log("[standard-report] Generating report with Gemini");
  
  try {
    // Format the user message with the chart data
    const userMessage = JSON.stringify({
      chartData: reportData.chartData,
      endpoint: reportData.endpoint,
      // Include any other relevant data from the request
      ...reportData
    });
    
    console.log(`[standard-report] Calling Gemini API with model: ${GOOGLE_MODEL}`);
    console.log(`[standard-report] API Key format check: ${GOOGLE_API_KEY.length > 20 ? "Valid length" : "Invalid length"}`);
    
    // Call the Gemini API with the correct model name and API version
    const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;
    console.log(`[standard-report] API URL (without key): ${GOOGLE_ENDPOINT}`); // Will now show v1beta
    
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
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    // Log response status and headers for debugging
    console.log(`[standard-report] Gemini API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[standard-report] Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error("[standard-report] No content or parts returned from Gemini API in candidate");
      throw new Error("No content or parts returned from Gemini API in candidate");
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    console.log("[standard-report] Successfully generated report");
    
    return generatedText;
  } catch (err) {
    console.error("[standard-report] Error generating report with Gemini:", err);
    throw err;
  }
}

// Main handler function
serve(async (req) => {
  console.log(`[standard-report] Received ${req.method} request`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[standard-report] Handling OPTIONS request (CORS preflight)");
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  
  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`[standard-report] Method not allowed: ${req.method}`);
    return jsonResponse(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }
  
  try {
    // Parse the request payload
    const reportData = await req.json();
    console.log(`[standard-report] Processing report for endpoint: ${reportData.endpoint}`);
    
    // Validate required fields
    if (!reportData.chartData || !reportData.endpoint) {
      console.error("[standard-report] Missing required fields in request payload");
      return jsonResponse(
        { error: "Missing required fields: chartData and endpoint are required" },
        { status: 400 }
      );
    }
    
    // Fetch the system prompt
    const systemPrompt = await getSystemPrompt();
    
    // Generate the report
    const report = await generateReport(systemPrompt, reportData);
    
    // Return the generated report
    console.log("[standard-report] Successfully processed request");
    return jsonResponse({ 
      success: true,
      report: report 
    });
  } catch (err) {
    console.error(`[standard-report] Error processing request: ${err instanceof Error ? err.message : String(err)}`);
    return jsonResponse({ 
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred"
    }, { status: 500 });
  }
});

console.log("[standard-report] Function initialized and ready to process requests");
