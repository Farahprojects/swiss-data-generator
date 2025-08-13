/* eslint-disable no-console */

/*───────────────────── standard-report.ts (responses-api, no-cache) ─────────────────────
   - Accepts JSON payload (incl. full chartData from Orchestrator)
   - Fetches system prompt from DB (no caching)
   - Calls OpenAI Responses API with native input_json (no stringify of chartData)
   - Fire-and-forget DB inserts
   - Minimal logging, fast fail, CORS
──────────────────────────────────────────────────────────────────────────────────────────*/
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*───────────────────────────────────────────────────────────────────────────────
  CONFIG
────────────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY_THREE") ?? "";
const API_TIMEOUT_MS = parseInt(Deno.env.get("API_TIMEOUT_MS") || "30000");

// Default to a fast, high-quality model; override via payload.selectedModel if needed
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
  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    {
      role: "user",
      content: [
        { type: "input_text", text: "Analyze the following Swiss Inference JSON according to the instructions." },
        // Native JSON into the model (no stringify)
        { type: "input_json", json: reportData.chartData },
        ...(reportData.endpoint ? [{ type: "input_text", text: `Endpoint: ${reportData.endpoint}` }] : []),
        ...(reportData.report_type || reportData.reportType
          ? [{ type: "input_text", text: `Report type: ${reportData.report_type ?? reportData.reportType}` }]
          : []),
      ],
    },
  ];

  const controller = new AbortController();
  const startFetchAt = Date.now();
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
      max_output_tokens: 900, // cap to keep latency tight; tweak if needed
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

  // Prefer the convenience field if present
  let outText: string | undefined = typeof data?.output_text === "string" ? data.output_text : undefined;
  let outJson: unknown | undefined;

  // Fallback: extract from the output parts
  if (!outText || data?.output) {
    try {
      const output = Array.isArray(data.output) ? data.output : [];
      // Concatenate any output_text parts and pick first output_json if present
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
      // ignore parse quirks, keep whatever we have
    }
  }

  return { text: outText?.trim(), json: outJson, usage: data?.usage ?? null, processingMs };
}

/*───────────────────────────────────────────────────────────────────────────────
  FIRE-AND-FORGET DB WRITES
────────────────────────────────────────────────────────────────────────────────*/
function logAndSignalCompletion(
  reportData: any,
  reportPayload: { text?: string; json?: unknown },
  metadata: any,
  durationMs: number,
  selectedEngine: string,
) {
  supabase
    .from("report_logs")
    .insert(
      {
        api_key: null,
        user_id: reportData.user_id ?? null,
        report_type: reportData.reportType ?? reportData.report_type ?? "standard",
        endpoint: reportData.endpoint,
        // Store whichever came back; text prioritized, else JSON string
        report_text: reportPayload.text ?? (reportPayload.json ? JSON.stringify(reportPayload.json) : null),
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
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405 });

  const t0 = Date.now();
  let reportData: any;
  try {
    reportData = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (reportData?.warm === true) return new Response("Warm-up", { status: 200, headers: CORS_HEADERS });

  try {
    const reportType = reportData.reportType ?? reportData.report_type ?? "standard";
    const selectedEngine = reportData.selectedEngine ?? "standard-report-two";
    const model = reportData.selectedModel ?? DEFAULT_MODEL;

    if (!reportData?.chartData) {
      return jsonResponse({ success: false, error: "Missing chartData from orchestrator" }, { status: 400 });
    }

    const sp = await getSystemPrompt(reportType);
    const t1 = Date.now();

    const out = await generateReport(sp, reportData, model);
    const t2 = Date.now();

    // Fire-and-forget DB writes
    logAndSignalCompletion(
      reportData,
      { text: out.text, json: out.json },
      { model, usage: out.usage, processing_ms: out.processingMs },
      t2 - t0,
      selectedEngine,
    );

    // Return both forms if present; you decide what to parse downstream
    return jsonResponse({
      success: true,
      model,
      report: {
        // Prefer text, but include json if model returned it
        text: out.text ?? null,
        json: out.json ?? null,
        generated_at: new Date().toISOString(),
        engine_used: selectedEngine,
      },
      timings_ms: {
        prompt_fetch: t1 - t0,
        openai_total: t2 - t1,
        total: t2 - t0,
        openai_processing: out.processingMs ?? null, // server-side time from header
      },
    });
  } catch (err) {
    return jsonResponse({ success: false, error: (err as Error).message }, { status: 500 });
  }
});
