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

    const { data: authResult, error } = await supabase.rpc("auth_uid_exists", { uid: p.user_id });

    if (error) {
      console.error("[orchestrator] ❌ RPC error from auth_uid_exists:", error);
      return { ok: false, reason: "User not found" };
    }

    console.log(`[orchestrator] 🔍 auth_uid_exists returned: ${authResult} for uid: ${p.user_id}`);

    if (!authResult) {
      console.warn(`[orchestrator] 🔴 UID not found in auth or guest tables: ${p.user_id}`);
      return { ok: false, reason: "User not found" };
    }

    console.log(`[orchestrator] ✅ UID verified successfully: ${p.user_id}`);
  }

  return { ok: true };
}

/*────────────────── DB HELPERS: engine + logging ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  const { data: last, error } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[orchestrator] ❌ Error fetching last engine:", error);
    return EDGE_ENGINES[0];
  }

  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  const nextEngine = EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];

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
  // Store the user_id (guest report ID or auth user ID) as string in report_logs
  const user_id = payload.user_id;

  const logData = {
    api_key: payload.apiKey ?? null,
    user_id: user_id, // Now expects TEXT type
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    status: "failed",
    error_message: errorMessage,
    duration_ms: durationMs ?? null,
  };

  console.log("[orchestrator] 📝 ATTEMPTING TO LOG FAILED ATTEMPT:", {
    user_id: logData.user_id,
    report_type: logData.report_type,
    engine_used: logData.engine_used,
    status: logData.status,
    error_message: logData.error_message,
    duration_ms: logData.duration_ms
  });

  try {
    const { data, error } = await supabase.from("report_logs").insert(logData).select();
    
    if (error) {
      console.error("[orchestrator] ❌ FAILED ATTEMPT LOG INSERT ERROR:", error);
      throw error;
    }
    
    console.log("[orchestrator] ✅ SUCCESSFULLY LOGGED FAILED ATTEMPT:", data);
  } catch (error) {
    console.error("[orchestrator] ❌ Failed to log failed attempt:", error);
  }
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

  const ids = {
    user_id: payload.is_guest ? null : payload.user_id,
    client_id: payload.is_guest ? payload.user_id : null,
  };

  // Store the user_id (guest report ID or auth user ID) as string in report_logs
  const user_id = payload.user_id;

  const successLogData = {
    api_key: payload.apiKey ?? null,
    user_id: user_id, // Now expects TEXT type
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    report_text: reportContent,
    status: "success",
    duration_ms: Date.now() - start,
  };

  // 🔍 DEBUG: Log exactly what we're trying to insert
  console.log("🔍 [orchestrator] SUCCESS LOG INSERT DEBUG:", {
    user_id: successLogData.user_id,
    user_id_type: typeof successLogData.user_id,
    user_id_length: successLogData.user_id ? successLogData.user_id.length : 0,
    is_guest: payload.is_guest,
    successLogData_keys: Object.keys(successLogData),
    successLogData_user_id: successLogData.user_id,
    successLogData_user_id_type: typeof successLogData.user_id,
    file: "reportOrchestrator.ts:success_insert",
    function: "processReportRequest"
  });

  console.log("[orchestrator] 📝 ATTEMPTING TO LOG SUCCESS TO report_logs:", {
    user_id: successLogData.user_id,
    report_type: successLogData.report_type,
    engine_used: successLogData.engine_used,
    status: successLogData.status,
    duration_ms: successLogData.duration_ms,
    report_text_length: successLogData.report_text?.length || 0
  });

  try {
    // 🔍 DEBUG: Check database constraints first
    console.log("🔍 [orchestrator] CHECKING DATABASE CONSTRAINTS...");
    const { data: constraintData, error: constraintError } = await supabase.rpc('check_report_logs_constraints', {});
    if (constraintError) {
      console.error("🔍 [orchestrator] ❌ CONSTRAINT CHECK ERROR:", constraintError);
    } else {
      console.log("🔍 [orchestrator] ✅ CONSTRAINT CHECK RESULT:", constraintData);
    }

    const { data, error } = await supabase.from("report_logs").insert(successLogData).select();
    
    if (error) {
      console.error("[orchestrator] ❌ SUCCESS LOG INSERT ERROR:", error);
      throw error;
    }
    
    console.log("[orchestrator] ✅ SUCCESSFULLY LOGGED TO report_logs:", {
      id: data?.[0]?.id,
      user_id: data?.[0]?.user_id,
      report_type: data?.[0]?.report_type,
      status: data?.[0]?.status,
      created_at: data?.[0]?.created_at
    });
  } catch (error) {
    console.error("[orchestrator] ❌ Failed to save success log:", error);
  }

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
