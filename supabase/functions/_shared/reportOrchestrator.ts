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
];

// Initialise Supabase SR client once per invocation
const initSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
};

// Small utility to surface query errors immediately
function check<T>(q: any): T {
  if (q.error) {
    console.error("[orchestrator] ❌ Database operation failed:", q.error);
    throw q.error;
  }
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
  console.log("[orchestrator] 🔍 Validating request:", {
    report_type: p.report_type,
    endpoint: p.endpoint,
    is_guest: p.is_guest
  });

  /* 1️⃣  valid report_type? */
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

  /* 2️⃣  basic field presence */
  if (!p.endpoint) {
    console.error("[orchestrator] ❌ Missing endpoint field");
    return { ok: false, reason: "Missing endpoint" };
  }
  if (!p.chartData) {
    console.error("[orchestrator] ❌ Missing chartData field");
    return { ok: false, reason: "Missing chartData" };
  }

  /* 3️⃣  guest vs user identity */
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

  console.log("[orchestrator] ✅ Validation passed");
  return { ok: true };
}

/*──────────────────────── USER-ID RESOLUTION ───────────────────────────────*/
async function resolveUserId(
  supabase: SupabaseClient,
  rawId: string | null,
  isGuest: boolean,
): Promise<{ user_id: string | null; client_id: string | null; error?: string }> {
  if (isGuest) {
    const { data: guest, error } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", rawId)
      .maybeSingle();
    
    if (error) {
      console.error("[orchestrator] ❌ Error querying guest_reports:", error);
      return { user_id: null, client_id: null, error: "Database error" };
    }
    
    return guest
      ? { user_id: null, client_id: rawId }
      : { user_id: null, client_id: null, error: "Guest not found" };
  }

  if (rawId && isUUID(rawId)) {
    return { user_id: rawId, client_id: null };
  }

  console.error("[orchestrator] ❌ Invalid user_id format:", rawId);
  return { user_id: null, client_id: null, error: "Invalid user_id" };
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

  try {
    await check(supabase.from("report_logs").insert(logData).select());
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
    is_guest: payload.is_guest
  });
  
  const start = Date.now();
  const supabase = initSupabase();

  /* Early validation – no OpenAI calls yet */
  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    console.warn(`[orchestrator] 🔴 Validation failed: ${v.reason}`);
    await logFailedAttempt(supabase, payload, "validator", v.reason, Date.now() - start);
    return { success: false, errorMessage: v.reason };
  }

  /* Choose edge engine */
  const engine = await getNextEngine(supabase);

  /* Call the edge function (costly path) */
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

  /* Save success row */
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

  try {
    await check(supabase.from("report_logs").insert(successLogData).select());
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
    engine: finalResult.report.engine_used
  });

  return finalResult;
};