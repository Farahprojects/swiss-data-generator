
// Standard Report Edge Function
// Generates standard reports using OpenAI's GPT-4.5 model
// Uses system prompts from the reports_prompts table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize environment variables
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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

// Generate report using OpenAI API
async function generateReport(systemPrompt: string, reportData: any): Promise<string> {
  console.log("[standard-report] Generating report with OpenAI GPT-4.5");
  
  try {
    // Format the user message with the chart data
    const userMessage = JSON.stringify({
      chartData: reportData.chartData,
      endpoint: reportData.endpoint,
      // Include any other relevant data from the request
      ...reportData
    });
    
    // Call the OpenAI API with GPT-4.5 model
    console.log("[standard-report] Calling OpenAI API with model: gpt-4.5-preview");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.5-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 8192,
        top_p: 0.95
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[standard-report] OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      console.error("[standard-report] No content returned from OpenAI API");
      throw new Error("No content returned from OpenAI API");
    }
    
    const generatedText = data.choices[0].message.content;
    console.log("[standard-report] Successfully generated report");
    
    return generatedText;
  } catch (err) {
    console.error("[standard-report] Error generating report with OpenAI:", err);
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

console.log("[standard-report] Function initialized and ready to process reports with OpenAI GPT-4.5");
