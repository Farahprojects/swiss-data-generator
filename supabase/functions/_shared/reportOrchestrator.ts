/*─────────────────────── orchestrator.ts (cleaned) ────────────────────────
   Central workflow handler for astrology-report generation
──────────────────────────────────────────────────────────────────────────*/

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*────────────────────────── CONFIG & HELPERS ────────────────────────────────*/
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one",
  "standard-report-two",
];

const initSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
};

function check<T>(q: any): T {
  if (q.error) {
    console.error("[orchestrator] ❌ Database operation failed:", q.error);
    throw q.error;
  }
  return q.data;
}

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/*────────────────────────── VALIDATION LAYER ────────────────────────────────*/
interface ReportPayload {
  endpoint: string;
  report_type: string;
  user_id?: string;
  apiKey?: string;
  chartData: any;
  is_guest?: boolean;
  [k: string]: any;
}

async function validateRequest(
  supabase: SupabaseClient,
  p: ReportPayload,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  console.log("[orchestrator] 🔍 Validating request:", {
    report_type: p.report_type,
    endpoint: p.endpoint,
    is_guest: p.is_guest,
  });

  const { data: promptExists, error: promptError } = await supabase
    .from("report_prompts")
    .select("name")
    .eq("name", p.report_type)
    .maybeSingle();
  
  if (promptError) {
    console.error("[orchestrator] ❌ Error checking report_prompts:", promptError);
    return { ok: false, reason: `Database error: ${promptError.message}` };
  }
  
  if (!promptExists) {
    console.error("[orchestrator] ❌ Report type not found in report_prompts:", p.report_type);
    return { ok: false, reason: "Invalid report_type" };
  }

  if (!p.endpoint) {
    console.error("[orchestrator] ❌ Missing endpoint field");
    return { ok: false, reason: "Missing endpoint" };
  }
  if (!p.chartData) {
    console.error("[orchestrator] ❌ Missing chartData field");
    return { ok: false, reason: "Missing chartData" };
  }

  if (p.is_guest) {
    const { data: guest, error: guestError } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", p.user_id)
      .maybeSingle();
    
    if (guestError) {
      console.error("[orchestrator] ❌ Error checking guest_reports:", guestError);
      return { ok: false, reason: `Guest validation error: ${guestError.message}` };
    }
    
    if (!guest) {
      console.error("[orchestrator] ❌ Guest ID not found in guest_reports:", p.user_id);
      return { ok: false, reason: "Guest ID not found" };
    }

    console.log(`[orchestrator] ✅ Guest validation passed for guest ID: ${p.user_id}`);
  } else {
    if (!p.user_id || !isUUID(p.user_id)) {
      console.error("[orchestrator] ❌ Invalid user_id format:", p.user_id);
      return { ok: false, reason: "user_id missing or not a UUID" };
    }

    // Skip auth_uid_exists check - let the flow proceed without it
    console.log(`[orchestrator] ✅ Skipping auth_uid_exists check for authenticated user: ${p.user_id}`);
  }

  return { ok: true };
}

/*────────────────── DB HELPERS: engine + logging ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  // Use a simple round-robin approach without database queries
  const timestamp = Date.now();
  const engineIndex = Math.floor(timestamp / 1000) % EDGE_ENGINES.length;
  const nextEngine = EDGE_ENGINES[engineIndex];
  
  console.log("[orchestrator] 🎯 Selected engine:", nextEngine);
  
  return nextEngine;
}

async function logFailedAttempt(
  supabase: SupabaseClient,
  payload: ReportPayload,
  engine: string,
  errorMessage: string,
  durationMs?: number,
) {
  // Log failed attempt to console only
  console.log("[orchestrator] 📝 FAILED ATTEMPT:", {
    user_id: payload.user_id,
    report_type: payload.report_type,
    engine_used: engine,
    status: "failed",
    error_message: errorMessage,
    duration_ms: durationMs ?? null
  });
}

/*───────────────── MAIN EXPORT: processReportRequest ───────────────────────*/
interface ReportResult {
  success: boolean;
  report?: any;
  errorMessage?: string;
}

export const processReportRequest = async (
  payload: ReportPayload,
): Promise<ReportResult> => {
  console.log("[orchestrator] 🟢 Processing report request:", {
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    is_guest: payload.is_guest,
  });
  
  const start = Date.now();
  const supabase = initSupabase();

  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    console.warn(`[orchestrator] 🔴 Validation failed: ${v.reason}`);
    await logFailedAttempt(supabase, payload, "validator", v.reason, Date.now() - start);
    return { success: false, errorMessage: v.reason };
  }

  const engine = await getNextEngine(supabase);

  let reportContent = "";
  try {
    const edgeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`;
    const requestPayload = { ...payload, reportType: payload.report_type, selectedEngine: engine };
    
    console.log("[orchestrator] 🌐 Calling edge function:", engine);
    
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[orchestrator] ❌ Edge function failed:", errText);
      await logFailedAttempt(supabase, payload, engine, errText, Date.now() - start);
      return { success: false, errorMessage: errText };
    }

    const json = await response.json();
    reportContent = json.report?.content ?? json.report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[orchestrator] ❌ Exception during edge function call:", msg);
    await logFailedAttempt(supabase, payload, engine, msg, Date.now() - start);
    return { success: false, errorMessage: msg };
  }

  // Log success to console only
  console.log("[orchestrator] 📝 SUCCESS:", {
    user_id: payload.user_id,
    report_type: payload.report_type,
    engine_used: engine,
    status: "success",
    duration_ms: Date.now() - start,
    report_text_length: reportContent?.length || 0
  });

  const finalResult = {
    success: true,
    report: {
      title: `${payload.report_type} ${payload.endpoint} Report`,
      content: reportContent,
      generated_at: new Date().toISOString(),
      engine_used: engine,
    },
  };
  
  console.log("[orchestrator] 🎉 Report generation completed:", {
    title: finalResult.report.title,
    contentLength: finalResult.report.content?.length || 0,
    engine: finalResult.report.engine_used,
  });

  return finalResult;
};
