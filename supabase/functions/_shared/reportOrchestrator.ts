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
  return createClient(url, key);
};

// Small utility to surface query errors immediately
function check<T>(q: any): T {
  if (q.error) throw q.error;
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
  /* 1️⃣  valid report_type? */
  const { data: promptExists } = await supabase
    .from("report_prompts")
    .select("name")
    .eq("name", p.report_type)
    .maybeSingle();
  if (!promptExists) return { ok: false, reason: "Invalid report_type" };

  /* 2️⃣  basic field presence */
  if (!p.endpoint) return { ok: false, reason: "Missing endpoint" };
  if (!p.chartData) return { ok: false, reason: "Missing chartData" };

  /* 3️⃣  guest vs user identity */
  if (p.is_guest) {
    const { data: guest } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", p.user_id)
      .maybeSingle();
    if (!guest) return { ok: false, reason: "Guest ID not found" };
  } else {
    if (!p.user_id || !isUUID(p.user_id))
      return { ok: false, reason: "user_id missing or not a UUID" };

    const { error } = await supabase.rpc("auth_uid_exists", { uid: p.user_id });
    /* `auth_uid_exists` is a tiny SQL hash function that returns void on success
       and raises an error when uid is absent; replace with your own check if
       you don’t have it.                                      */
    if (error) return { ok: false, reason: "User not found" };
  }

  /* (Optional 4️⃣  balance / credit check goes here) */

  return { ok: true };
}

/*──────────────────────── USER-ID RESOLUTION ───────────────────────────────*/
async function resolveUserId(
  supabase: SupabaseClient,
  rawId: string | null,
  isGuest: boolean,
): Promise<{ user_id: string | null; client_id: string | null; error?: string }> {
  if (isGuest) {
    const { data: guest } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", rawId)
      .maybeSingle();
    return guest
      ? { user_id: null, client_id: rawId }
      : { user_id: null, client_id: null, error: "Guest not found" };
  }

  if (rawId && isUUID(rawId)) return { user_id: rawId, client_id: null };

  return { user_id: null, client_id: null, error: "Invalid user_id" };
}

/*────────────────── DB HELPERS: engine + logging ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  const { data: last } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  return EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
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

  await check(supabase.from("report_logs").insert({
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
  }).select());
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
  const start = Date.now();
  const supabase = initSupabase();

  /* Early validation – no OpenAI calls yet */
  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    await logFailedAttempt(supabase, payload, "validator", v.reason, Date.now() - start);
    return { success: false, errorMessage: v.reason };
  }

  /* Choose edge engine */
  const engine = await getNextEngine(supabase);
  console.log(`[orchestrator] using engine: ${engine}`);

  /* Call the edge function (costly path) */
  let reportContent = "";
  try {
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reportType: payload.report_type, selectedEngine: engine }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      await logFailedAttempt(supabase, payload, engine, errText, Date.now() - start);
      return { success: false, errorMessage: errText };
    }

    const json = await response.json();
    reportContent = json.report?.content ?? json.report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logFailedAttempt(supabase, payload, engine, msg, Date.now() - start);
    return { success: false, errorMessage: msg };
  }

  /* Save success row */
  const ids = await resolveUserId(
    supabase,
    payload.user_id ?? null,
    payload.is_guest ?? false,
  );

  await check(supabase.from("report_logs").insert({
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
  }).select());

  return {
    success: true,
    report: {
      title: `${payload.report_type} ${payload.endpoint} Report`,
      content: reportContent,
      generated_at: new Date().toISOString(),
      engine_used: engine,
    },
  };
};
