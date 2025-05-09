// Standard Report Edge Function
// Generates standard reports using OpenAI's GPT-4.5 model (GPT-4-turbo)
// Uses system prompts from the reports_prompts table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize environment variables
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Log environment checks
console.log("[standard-report] Environment check:");
console.log(`[standard-report] SUPABASE_URL exists: ${!!SUPABASE_URL}`);
console.log(`[standard-report] SUPABASE_SERVICE_KEY exists: ${!!SUPABASE_SERVICE_KEY}`);
console.log(`[standard-report] OPENAI_API_KEY exists: ${!!OPENAI_API_KEY}`);

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[standard-report] Missing required environment variables");
  throw new Error("Missing required environment variables");
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Fetch the system prompt from the database
async function getSystemPrompt(): Promise<string> {
  console.log("[standard-report] Fetching system prompt from database");
  
  const { data, error } = await supabase
    .from("report_prompts")
    .select("system_prompt")
    .eq("name", "standard")
    .maybeSingle();

  if (error || !data?.system_prompt) {
    console.error("[standard-report] Failed to fetch system prompt:", error?.message);
    throw new Error("System prompt not found for standard report");
  }

  return data.system_prompt;
}

// Generate report using OpenAI GPT-4.5 (turbo)
async function generateReport(systemPrompt: string, reportData: any): Promise<string> {
  console.log("[standard-report] Generating report with GPT-4-turbo");

  const userMessage = JSON.stringify({
    chartData: reportData.chartData,
    endpoint: reportData.endpoint,
    ...reportData
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
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

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("No content returned from OpenAI API");
  }

  return data.choices[0].message.content;
}

// Edge Function entrypoint
serve(async (req) => {
  console.log(`[standard-report] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const reportData = await req.json();

    if (!reportData.chartData || !reportData.endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chartData and endpoint are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const systemPrompt = await getSystemPrompt();
    const report = await generateReport(systemPrompt, reportData);

    return new Response(
      JSON.stringify({ success: true, report }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[standard-report] Error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error generating report"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

console.log("[standard-report] Ready to generate standard reports with GPT-4.5 (turbo)");
