/* eslint-disable no-console */

/*──────── standard-report.ts (responses-api, no-cache, structured-logs, fixed) ────────
   - Uses OpenAI Responses API
   - Sends chartData as input_text (stringified JSON) ← FIX for 400 invalid_value
   - Fire-and-forget DB inserts
   - Structured JSON logs + error rows
──────────────────────────────────────────────────────────────────────────────────────*/
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*───────────────────────────────────────────────────────────────────────────────
  CONFIG
────────────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000");
const DEFAULT_MODEL = "gpt-4o-mini";
const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY_THREE");

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Content-Type": "application/json",
};

/*───────────────────────────────────────────────────────────────────────────────
  LOGGING
────────────────────────────────────────────────────────────────────────────────*/
function slog(level: "info" | "error" | "warn", event: string, meta: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ level, event, ts: new Date().toISOString(), ...meta }));
  } catch {
    console.log(`[${level}] ${event}`);
  }
}

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
    .single();
  if (error) throw new Error(`Failed to fetch system prompt (status ${status}): ${error.message}`);
  if (!data?.system_prompt) throw new Error(`System prompt not found for ${reportType}`);
  return data.system_prompt;
}

/*───────────────────────────────────────────────────────────────────────────────
  OPENAI (Responses API)
────────────────────────────────────────────────────────────────────────────────*/
type GenOut = {
  text?: string;
  json?: unknown;
  usage?: unknown;
  processingMs?: number;
};

async function generateReport(systemPrompt: string, reportData: any, model: string): Promise<GenOut> {
  // Stringify once; Responses API only accepts input_text (no input_json)
  let chartDataStr = "";
  try {
    chartDataStr = JSON.stringify(reportData.chartData);
  } catch (e) {
    throw new Error("chartData is not serializable JSON");
  }

  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    {
      role: "user",
      content: [
        { type: "input_text", text: "Analyze the following Swiss Inference JSON according to the instructions." },
        { type: "input_text", text: chartDataStr }, // ← send JSON as text
        ...(reportData.endpoint ? [{ type: "input_text", text: `Endpoint: ${reportData.endpoint}` }] : []),
        ...(reportData.report_type || reportData.reportType
          ? [{ type: "input_text", text: `Report type: ${reportData.report_type ?? reportData.reportType}` }]
          : []),
      ],
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const res = await fetch(RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      temperature: 0.2,
      max_output_tokens: 900,
    }),
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(timeoutId);
    throw e;
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI Responses error: ${res.status} - ${text}`);
  }

  const processingMs = Number(res.headers.get("openai-processing-ms") ?? 0);
  const data = await res.json();

  // Extract output text / json if present
  let outText: string | undefined = typeof data?.output_text === "string" ? data.output_text : undefined;
  let outJson: unknown | undefined;

  if (!outText || data?.output) {
    try {
      const output = Array.isArray(data.output) ? data.output : [];
      let buf = outText ?? "";
      for (const item of output) {
        const parts = Array.isArray(item?.content) ? item.content : [];
        for (const p of parts) {
          if (p?.type === "output_text" && typeof p.text === "string") buf += p.text;
          if (!outJson && p?.type === "output_json") outJson = p.json;
        }
      }
      outText = buf || outText;
    } catch {
      // ignore parse quirks
    }
  }

  return { text: outText?.trim(), json: outJson, usage: data?.usage ?? null, processingMs };
}

/*───────────────────────────────────────────────────────────────────────────────
  DB LOGGING
────────────────────────────────────────────────────────────────────────────────*/
function logSuccess(reportData: any, payload: { text?: string; json?: unknown }, metadata: any, durationMs: number, engine: string) {
  supabase
    .from("report_logs")
    .insert(
      {
        api_key: null,
        user_id: reportData.user_id ?? null,
        report_type: reportData.reportType ?? reportData.report_type ?? "standard",
        endpoint: reportData.endpoint,
        report_text: payload.text ?? (payload.json ? JSON.stringify(payload.json) : null),
        status: "success",
        duration_ms: durationMs,
        client_id: reportData.client_id ?? null,
        engine_used: engine,
        metadata,
        is_guest: reportData.is_guest ?? false,
        created_at: new Date().toISOString(),
      },
      { returning: "minimal" },
    )
    .then(null, () => {});
}

function logError(reportData: any, errorMessage: string, engine: string, meta: Record<string, unknown> = {}) {
  supabase
    .from("report_logs")
    .insert(
      {
        api_key: null,
        user_id: reportData?.user_id ?? null,
        report_type: reportData?.reportType ?? reportData?.report_type ?? "standard",
        endpoint: reportData?.endpoint ?? null,
        report_text: null,
        status: "error",
        duration_ms: null,
        client_id: reportData?.client_id ?? null,
        engine_used: engine,
        metadata: { error: errorMessage, ...meta },
        is_guest: reportData?.is_guest ?? false,
        created_at: new Date().toISOString(),
      },
      { returning: "minimal" },
    )
    .then(null, () => {});
}

/*───────────────────────────────────────────────────────────────────────────────
  HANDLER
────────────────────────────────────────────────────────────────────────────────*/
serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  let reportData: any;
  try {
    reportData = await req.json();
  } catch (e) {
    slog("error", "request.parse_failed", { requestId, err: (e as Error).message });
    return jsonResponse({ success: false, error: "Invalid JSON body", requestId }, { status: 400 });
  }

  const reportType = reportData.reportType ?? reportData.report_type ?? "standard";
  const selectedEngine = reportData.selectedEngine ?? "standard-report-two";
  const model = reportData.selectedModel ?? DEFAULT_MODEL;

  // Warm-up
  if (reportData?.warm === true) {
    slog("info", "warmup.ok", { requestId });
    return new Response("Warm-up", { status: 200, headers: CORS_HEADERS });
  }

  // Basic payload sanity
  const chartDataPresent = !!reportData?.chartData;
  const approxSize = (() => {
    try { return JSON.stringify(reportData?.chartData ?? {}).length; } catch { return null; }
  })();

  slog("info", "request.received", {
    requestId,
    user_id: reportData.user_id ?? null,
    reportType,
    endpoint: reportData.endpoint ?? null,
    chartData_present: chartDataPresent,
    chartData_size: approxSize,
    model,
  });

  if (!chartDataPresent) {
    const msg = "Missing chartData from orchestrator";
    slog("error", "request.missing_chartdata", { requestId });
    logError(reportData, msg, selectedEngine);
    return jsonResponse({ success: false, error: msg, requestId }, { status: 400 });
  }

  try {
    // Fetch system prompt
    const spStart = Date.now();
    const systemPrompt = await getSystemPrompt(reportType);
    const spMs = Date.now() - spStart;
    slog("info", "prompt.fetched", { requestId, reportType, ms: spMs });

    // OpenAI call
    slog("info", "openai.call.start", { requestId, model });
    const genStart = Date.now();
    const out = await generateReport(systemPrompt, reportData, model);
    const genMs = Date.now() - genStart;
    slog("info", "openai.call.end", {
      requestId,
      model,
      openai_processing_ms: out.processingMs ?? null,
      openai_total_ms: genMs,
    });

    // Fire-and-forget DB log (success)
    const totalMs = Date.now() - t0;
    logSuccess(
      reportData,
      { text: out.text, json: out.json },
      { model, usage: out.usage, processing_ms: out.processingMs, timings_ms: { prompt_ms: spMs, openai_ms: genMs, total_ms: totalMs } },
      totalMs,
      selectedEngine,
    );

    slog("info", "response.success", { requestId, total_ms: totalMs });

    return jsonResponse({
      success: true,
      requestId,
      model,
      report: {
        text: out.text ?? null,
        json: out.json ?? null,
        generated_at: new Date().toISOString(),
        engine_used: selectedEngine,
      },
      timings_ms: {
        prompt_fetch: spMs,
        openai_total: genMs,
        total: totalMs,
        openai_processing: out.processingMs ?? null,
      },
    });
  } catch (err) {
    const msg = (err as Error).message || "Unhandled error";
    slog("error", "response.error", { requestId, err: msg });
    logError(reportData, msg, selectedEngine);
    return jsonResponse({ success: false, requestId, error: msg }, { status: 500 });
  }
});
