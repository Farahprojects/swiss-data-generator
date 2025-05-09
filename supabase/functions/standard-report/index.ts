
// Standard Report Edge Function
// Generates standard reports using Google's Gemini 2.5 Flash Preview model
// Uses system prompts from the reports_prompts table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize environment variables
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[standard-report] Missing required environment variables");
  throw new Error("Missing required environment variables");
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers for cross-domain requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

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
    
    // Updated to use the correct model name: gemini-1.5-flash
    // According to the latest Gemini API documentation, this is the most stable model
    console.log("[standard-report] Calling Gemini API with model: gemini-1.5-flash");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[standard-report] Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error("[standard-report] No content returned from Gemini API");
      throw new Error("No content returned from Gemini API");
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
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // Only accept POST requests
  if (req.method !== "POST") {
    console.warn(`[standard-report] Method not allowed: ${req.method}`);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  
  try {
    // Parse the request payload
    const reportData = await req.json();
    console.log(`[standard-report] Processing report for endpoint: ${reportData.endpoint}`);
    
    // Validate required fields
    if (!reportData.chartData || !reportData.endpoint) {
      console.error("[standard-report] Missing required fields in request payload");
      return new Response(
        JSON.stringify({ error: "Missing required fields: chartData and endpoint are required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Fetch the system prompt
    const systemPrompt = await getSystemPrompt();
    
    // Generate the report
    const report = await generateReport(systemPrompt, reportData);
    
    // Return the generated report
    console.log("[standard-report] Successfully processed request");
    return new Response(
      JSON.stringify({ 
        success: true,
        report: report 
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error(`[standard-report] Error processing request: ${err instanceof Error ? err.message : String(err)}`);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

console.log("[standard-report] Function initialized and ready to process requests");
