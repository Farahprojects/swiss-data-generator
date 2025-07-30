/* eslint-disable no-console */

/*─────────────────────── orchestrator.ts (cleaned) ────────────────────────
   Central workflow handler for astrology-report generation
   Fire-and-forget handoff to AI engines
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
  const { data: promptExists, error: promptError } = await supabase
    .from("report_prompts")
    .select("name")
    .eq("name", p.report_type)
    .maybeSingle();
  
  if (promptError) {
    return { ok: false, reason: `Database error: ${promptError.message}` };
  }
  
  if (!promptExists) {
    return { ok: false, reason: "Invalid report_type" };
  }

  if (!p.endpoint) {
    return { ok: false, reason: "Missing endpoint" };
  }
  if (!p.chartData) {
    return { ok: false, reason: "Missing chartData" };
  }

  if (p.is_guest) {
    const { data: guest, error: guestError } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", p.user_id)
      .maybeSingle();
    
    if (guestError) {
      return { ok: false, reason: `Guest validation error: ${guestError.message}` };
    }
    
    if (!guest) {
      return { ok: false, reason: "Guest ID not found" };
    }
  } else {
    if (!p.user_id || !isUUID(p.user_id)) {
      return { ok: false, reason: "user_id missing or not a UUID" };
    }
  }

  return { ok: true };
}

/*────────────────── DB HELPERS: engine selection ───────────────────────────*/
async function getNextEngine(supabase: SupabaseClient) {
  const { data: last, error } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    return EDGE_ENGINES[0];
  }
  
  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  const nextEngine = EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
  
  return nextEngine;
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
  const supabase = initSupabase();

  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    return { success: false, errorMessage: v.reason };
  }

  const engine = await getNextEngine(supabase);

  // Fire-and-forget: do not wait for edge function to return
  const edgeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`;
  const requestPayload = { ...payload, reportType: payload.report_type, selectedEngine: engine };
  
  fetch(edgeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  }).catch(() => {
    // Fail silently — logging is the engine's responsibility
  });

  // Return immediately after fire-and-forget call
  return {
    success: true,
    report: {
      title: `${payload.report_type} ${payload.endpoint} Report`,
      content: "", // Engine will handle content generation
      generated_at: new Date().toISOString(),
      engine_used: engine,
    },
  };
};
