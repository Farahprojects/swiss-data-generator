/*─────────────────────── orchestrator.ts (cleaned) ────────────────────────
   Central workflow handler for astrology-report generation
   ───────────────────────────────────────────────────────────────────────────*/

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

/*────────────────────────── VALIDATION ───────────────────────────────*/
interface ReportPayload {
  endpoint: string;
  report_type: string;
  user_id?: string;
  apiKey?: string;
  chartData: any;
  is_guest?: boolean;
  [k: string]: any;
}

async function validateRequest(supabase: SupabaseClient, p: ReportPayload): Promise<{ ok: true } | { ok: false; reason: string }> {
  console.log("[orchestrator] 🔍 Validating request:", p);

  const { data: promptExists, error: promptError } = await supabase
    .from("report_prompts")
    .select("name")
    .eq("name", p.report_type)
    .maybeSingle();

  if (promptError || !promptExists) {
    const reason = promptError?.message || "Invalid report_type";
    return { ok: false, reason };
  }

  if (!p.endpoint || !p.chartData) {
    return { ok: false, reason: "Missing endpoint or chartData" };
  }

  if (p.is_guest) {
    const { data, error } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", p.user_id)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, reason: "Invalid guest user_id" };
    }
  } else {
    if (!p.user_id || !isUUID(p.user_id)) {
      return { ok: false, reason: "Invalid user_id format" };
    }
    const { data, error } = await supabase.rpc("auth_uid_exists", { uid: p.user_id });
    if (error || !data) {
      return { ok: false, reason: "User not found" };
    }
  }

  return { ok: true };
}

/*────────────────── ENGINE LOGGING ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  const { data: last, error } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  return EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
}

/*───────────────── MAIN EXPORT ─────────────────────*/
interface ReportResult {
  success: boolean;
  report?: any;
  errorMessage?: string;
}

export const processReportRequest = async (payload: ReportPayload): Promise<ReportResult> => {
  console.log("[orchestrator] 🟢 Processing report request:", payload);

  const start = Date.now();
  const supabase = initSupabase();

  const valid = await validateRequest(supabase, payload);
  if (!valid.ok) {
    return { success: false, errorMessage: valid.reason };
  }

  const engine = await getNextEngine(supabase);
  let reportContent = "";

  try {
    const edgeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`;
    const requestPayload = { ...payload, reportType: payload.report_type, selectedEngine: engine };

    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, errorMessage: errorText };
    }

    const json = await response.json();
    reportContent = json.report?.content ?? json.report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, errorMessage: msg };
  }

  const successLog = {
    api_key: payload.apiKey ?? null,
    user_id: payload.user_id ?? null,
    client_id: payload.is_guest ? payload.user_id : null,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    report_text: reportContent,
    status: "success",
    duration_ms: Date.now() - start,
    created_at: new Date().toISOString(),
  };

  try {
    await check(supabase.from("report_logs").insert(successLog).select());
  } catch (e) {
    console.error("[orchestrator] ❌ Failed to log success:", e);
  }

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
