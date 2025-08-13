/* eslint-disable no-console */

/*─────────────────────Made──────────────────────────────────────────────────────────
  standard-report.ts (no-cache)
  Edge Function: Generates standard reports using OpenAI's GPT-4o model
  Uses system prompts from the report_prompts table
  Leaned out for speed: no prompt caching, minimal logging, fire-and-forget DB writes.
────────────────────────────────────────────────────────────────────────────────*/
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*───────────────────────────────────────────────────────────────────────────────
  CONFIG
────────────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY_THREE");

let supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OPENAI_MODEL = "gpt-4o";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Content-Type": "application/json",
};

/*───────────────────────────────────────────────────────────────────────────────
  UTILS
────────────────────────────────────────────────────────────────────────────────*/
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers ?? {}) },
  });
}

async function getSystemPrompt(reportType: string): Promise<string> {
  const { data, error, status } = await supabase
    .from("report_prompts")
    .select("system_prompt")
    .eq("name", reportType)
    .single(); // fail if multiple

  if (error) throw new Error(`Failed to fetch system prompt (status ${status}): ${error.message}`);
  if (!data?.system_prompt) throw new Error(`System prompt not found for ${reportType}`);
  return data.system_prompt;
}

async function generateReport(systemPrompt: string, reportData: any): Promise<{ report: string; metadata: any }> {
  const userPayload = {
    chartData: reportData.chartData,
    endpoint: reportData.endpoint,
    report_type: reportData.report_type ?? reportData.reportType,
  };

  const requestBody = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
    top_p: 0.95,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(timeoutId);
    throw e;
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Malformed OpenAI response: no content");

  const metadata = {
    token_count: data?.usage?.total_tokens ?? 0,
    prompt_tokens: data?.usage?.prompt_tokens ?? 0,
    completion_tokens: data?.usage?.completion_tokens ?? 0,
    model: OPENAI_MODEL,
  };

  return { report: content, metadata };
}

// Fire-and-forget logging/signals (no await)
function logAndSignalCompletion(reportData: any, report: string, metadata: any, durationMs: number, selectedEngine: string) {
  supabase
    .from("report_logs")
    .insert(
      {
        api_key: null,
        user_id: reportData.user_id ?? null,
        report_type: reportData.reportType ?? reportData.report_type ?? "standard",
        endpoint: reportData.endpoint,
        report_text: report,
        status: "success",
        duration_ms: durationMs,
        client_id: reportData.client_id ?? null,
        engine_used: selectedEngine,
        metadata,
        is_guest: reportData.is_guest ?? false,
        created_at: new Date().toISOString(),
      },
      { returning: "minimal" },
    )
    .then(null, () => { /* swallow */ });

  if (reportData.is_guest && reportData.user_id) {
    supabase
      .from("report_ready_signals")
      .insert({ guest_report_id: reportData.user_id }, { returning: "minimal" })
      .then(null, () => { /* swallow */ });
  }
}

/*───────────────────────────────────────────────────────────────────────────────
  HANDLER
────────────────────────────────────────────────────────────────────────────────*/
serve(async (req) => {
  const start = Date.now();

  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  try {
    const reportData = await req.json();

    // Warm-up
    if (reportData?.warm === true) return new Response("Warm-up", { status: 200, headers: CORS_HEADERS });

    const reportType = reportData.reportType ?? reportData.report_type ?? "standard";
    const selectedEngine = reportData.selectedEngine ?? "standard-report-two";

    const systemPrompt = await getSystemPrompt(reportType);
    const { report, metadata } = await generateReport(systemPrompt, reportData);

    const durationMs = Date.now() - start;
    logAndSignalCompletion(reportData, report, metadata, durationMs, selectedEngine);

    return jsonResponse({
      success: true,
      report: {
        title: `${reportType} ${reportData.endpoint} Report`,
        content: report,
        generated_at: new Date().toISOString(),
        engine_used: selectedEngine,
      },
    });
  } catch (err) {
    // Fail fast with minimal payload
    return jsonResponse({ success: false, error: (err as Error).message }, { status: 500 });
  }
});
