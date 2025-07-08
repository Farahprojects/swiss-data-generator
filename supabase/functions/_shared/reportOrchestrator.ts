/*─────────────────────── orchestrator.ts (rewritten) ────────────────────────
   Central workflow handler for astrology-report generation
   ───────────────────────────────────────────────────────────────────────────*/

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/*────────────────────────── CONFIG & HELPERS ────────────────────────────────*/
// Edge engines available for round-robin load-balancing
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one",
  "standard-report-two",
  "standard-report-three",
];

// Initialise Supabase SR client once per invocation
const initSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  console.log("[orchestrator] 🔧 Initializing Supabase client");
  return createClient(url, key);
};

// Small utility to surface query errors immediately
function check<T>(q: any): T {
  if (q.error) {
    console.error("[orchestrator] ❌ Database operation failed:", q.error);
    throw q.error;
  }
  console.log("[orchestrator] ✅ Database operation successful");
  return q.data;
}

const isUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(v);

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
  console.log("[orchestrator] 🔍 Starting validation for payload:", {
    report_type: p.report_type,
    endpoint: p.endpoint,
    user_id: p.user_id ? "present" : "missing",
    is_guest: p.is_guest,
    has_chartData: !!p.chartData
  });

  /* 1️⃣  valid report_type? */
  console.log("[orchestrator] 🔍 Checking if report_type exists in report_prompts:", p.report_type);
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
  console.log("[orchestrator] ✅ Report type validated:", p.report_type);

  /* 2️⃣  basic field presence */
  if (!p.endpoint) {
    console.error("[orchestrator] ❌ Missing endpoint field");
    return { ok: false, reason: "Missing endpoint" };
  }
  if (!p.chartData) {
    console.error("[orchestrator] ❌ Missing chartData field");
    return { ok: false, reason: "Missing chartData" };
  }
  console.log("[orchestrator] ✅ Basic fields validated (endpoint, chartData)");

  /* 3️⃣  guest vs user identity */
  if (p.is_guest) {
    console.log("[orchestrator] 🔍 Validating guest user:", p.user_id);
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
    console.log("[orchestrator] ✅ Guest user validated:", p.user_id);
  } else {
    console.log("[orchestrator] 🔍 Validating regular user:", p.user_id);
    if (!p.user_id || !isUUID(p.user_id)) {
      console.error("[orchestrator] ❌ Invalid user_id format:", p.user_id);
      return { ok: false, reason: "user_id missing or not a UUID" };
    }

    const { error } = await supabase.rpc("auth_uid_exists", { uid: p.user_id });
    if (error) {
      console.error("[orchestrator] ❌ User not found or auth error:", error);
      return { ok: false, reason: "User not found" };
    }
    console.log("[orchestrator] ✅ Regular user validated:", p.user_id);
  }

  console.log("[orchestrator] ✅ All validation checks passed");
  return { ok: true };
}

/*──────────────────────── USER-ID RESOLUTION ───────────────────────────────*/
async function resolveUserId(
  supabase: SupabaseClient,
  rawId: string | null,
  isGuest: boolean,
): Promise<{ user_id: string | null; client_id: string | null; error?: string }> {
  console.log("[orchestrator] 🔍 Resolving user ID:", { rawId, isGuest });
  
  if (isGuest) {
    console.log("[orchestrator] 🔍 Guest mode - checking guest_reports table");
    const { data: guest, error } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", rawId)
      .maybeSingle();
    
    if (error) {
      console.error("[orchestrator] ❌ Error querying guest_reports:", error);
      return { user_id: null, client_id: null, error: "Database error" };
    }
    
    const result = guest
      ? { user_id: null, client_id: rawId }
      : { user_id: null, client_id: null, error: "Guest not found" };
    
    console.log("[orchestrator] 📋 Guest resolution result:", result);
    return result;
  }

  if (rawId && isUUID(rawId)) {
    console.log("[orchestrator] ✅ Regular user ID resolved:", rawId);
    return { user_id: rawId, client_id: null };
  }

  console.error("[orchestrator] ❌ Invalid user_id format:", rawId);
  return { user_id: null, client_id: null, error: "Invalid user_id" };
}

/*────────────────── DB HELPERS: engine + logging ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  console.log("[orchestrator] 🔍 Selecting next engine from available engines:", EDGE_ENGINES);
  
  const { data: last, error } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error("[orchestrator] ❌ Error fetching last engine:", error);
    console.log("[orchestrator] 🔄 Defaulting to first engine");
    return EDGE_ENGINES[0];
  }
  
  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  const nextEngine = EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
  
  console.log("[orchestrator] 🎯 Engine selection:", {
    lastEngine: last?.engine_used || "none",
    nextEngine,
    availableEngines: EDGE_ENGINES
  });
  
  return nextEngine;
}

async function logFailedAttempt(
  supabase: SupabaseClient,
  payload: ReportPayload,
  engine: string,
  errorMessage: string,
  durationMs?: number,
) {
  console.log("[orchestrator] 📝 Logging failed attempt:", {
    engine,
    errorMessage,
    durationMs,
    user_id: payload.user_id,
    is_guest: payload.is_guest
  });
  
  const ids = await resolveUserId(
    supabase,
    payload.user_id ?? null,
    payload.is_guest ?? false,
  );

  const logData = {
    api_key: payload.apiKey ?? null,
    user_id: ids.user_id,
    client_id: ids.client_id,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    status: "failed",
    error_message: errorMessage,
    duration_ms: durationMs ?? null,
    created_at: new Date().toISOString(),
  };
  
  console.log("[orchestrator] 📝 Inserting failed log with data:", logData);

  try {
    const result = await check(supabase.from("report_logs").insert(logData).select());
    console.log("[orchestrator] ✅ Failed attempt logged successfully:", result);
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
  console.log("[orchestrator] 🟢 Received request to generate report");
  console.log("[orchestrator] 📋 Full payload:", JSON.stringify(payload, null, 2));
  
  const start = Date.now();
  const supabase = initSupabase();

  /* Early validation – no OpenAI calls yet */
  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    console.warn(`[orchestrator] 🔴 Validation failed: ${v.reason}`);
    await logFailedAttempt(supabase, payload, "validator", v.reason, Date.now() - start);
    return { success: false, errorMessage: v.reason };
  } else {
    console.log(`[orchestrator] ✅ Validation passed`);
  }

  /* Choose edge engine */
  const engine = await getNextEngine(supabase);
  console.log(`[orchestrator] 🚀 Using engine: ${engine}`);

  /* Call the edge function (costly path) */
  let reportContent = "";
  try {
    const edgeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`;
    const requestPayload = { ...payload, reportType: payload.report_type, selectedEngine: engine };
    
    console.log("[orchestrator] 🌐 Making request to edge function:", {
      url: edgeUrl,
      engine,
      payloadKeys: Object.keys(requestPayload)
    });
    
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    console.log("[orchestrator] 📡 Edge function response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[orchestrator] ❌ Edge function failed with error:", errText);
      await logFailedAttempt(supabase, payload, engine, errText, Date.now() - start);
      return { success: false, errorMessage: errText };
    }

    const json = await response.json();
    console.log("[orchestrator] 📄 Edge function JSON response keys:", Object.keys(json));
    console.log("[orchestrator] 📄 Raw response:", JSON.stringify(json, null, 2));
    
    reportContent = json.report?.content ?? json.report;
    console.log("[orchestrator] 📝 Extracted report content length:", reportContent?.length || 0);
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[orchestrator] ❌ Exception during edge function call:", msg);
    await logFailedAttempt(supabase, payload, engine, msg, Date.now() - start);
    return { success: false, errorMessage: msg };
  }

  /* Save success row */
  console.log("[orchestrator] 💾 Preparing to save success log to database");
  
  const ids = await resolveUserId(
    supabase,
    payload.user_id ?? null,
    payload.is_guest ?? false,
  );

  const successLogData = {
    api_key: payload.apiKey ?? null,
    user_id: ids.user_id,          // null for guests
    client_id: ids.client_id,      // guest UUID or null
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    report_text: reportContent,
    status: "success",
    duration_ms: Date.now() - start,
    created_at: new Date().toISOString(),
  };
  
  console.log("[orchestrator] 💾 Inserting success log with data:", {
    ...successLogData,
    report_text: `[${successLogData.report_text?.length || 0} chars]` // Don't log full content
  });

  try {
    const result = await check(supabase.from("report_logs").insert(successLogData).select());
    console.log("[orchestrator] ✅ Success log saved to database:", result);
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
  
  console.log("[orchestrator] 🎉 Report generation completed successfully:", {
    title: finalResult.report.title,
    contentLength: finalResult.report.content?.length || 0,
    engine: finalResult.report.engine_used
  });

  return finalResult;
};