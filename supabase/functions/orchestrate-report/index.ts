
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleError, corsHeaders } from "../_shared/errorHandler.ts";

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
    console.error("[orchestrate-report] ❌ Database operation failed:", q.error);
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
  console.log("[orchestrate-report] 🔍 Validating request:", {
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
    console.error("[orchestrate-report] ❌ Error checking report_prompts:", promptError);
    return { ok: false, reason: `Database error: ${promptError.message}` };
  }
  
  if (!promptExists) {
    console.error("[orchestrate-report] ❌ Report type not found in report_prompts:", p.report_type);
    return { ok: false, reason: "Invalid report_type" };
  }

  if (!p.endpoint) {
    console.error("[orchestrate-report] ❌ Missing endpoint field");
    return { ok: false, reason: "Missing endpoint" };
  }
  if (!p.chartData) {
    console.error("[orchestrate-report] ❌ Missing chartData field");
    return { ok: false, reason: "Missing chartData" };
  }

  if (p.is_guest) {
    const { data: guest, error: guestError } = await supabase
      .from("guest_reports")
      .select("id")
      .eq("id", p.user_id)
      .maybeSingle();
    
    if (guestError) {
      console.error("[orchestrate-report] ❌ Error checking guest_reports:", guestError);
      return { ok: false, reason: `Guest validation error: ${guestError.message}` };
    }
    
    if (!guest) {
      console.error("[orchestrate-report] ❌ Guest ID not found in guest_reports:", p.user_id);
      return { ok: false, reason: "Guest ID not found" };
    }

    console.log(`[orchestrate-report] ✅ Guest validation passed for guest ID: ${p.user_id}`);
  } else {
    if (!p.user_id || !isUUID(p.user_id)) {
      console.error("[orchestrate-report] ❌ Invalid user_id format:", p.user_id);
      return { ok: false, reason: "user_id missing or not a UUID" };
    }

    console.log(`[orchestrate-report] ✅ Skipping auth_uid_exists check for authenticated user: ${p.user_id}`);
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
    console.error("[orchestrate-report] ❌ Error fetching last engine:", error);
    return EDGE_ENGINES[0];
  }
  
  const idx = last ? EDGE_ENGINES.indexOf(last.engine_used) : -1;
  const nextEngine = EDGE_ENGINES[(idx + 1) % EDGE_ENGINES.length];
  
  console.log("[orchestrate-report] 🎯 Selected engine:", nextEngine);
  
  return nextEngine;
}

async function logFailedAttempt(
  supabase: SupabaseClient,
  payload: ReportPayload,
  engine: string,
  errorMessage: string,
  durationMs?: number,
) {
  const user_id = payload.user_id;

  const logData = {
    api_key: payload.apiKey ?? null,
    user_id: user_id,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    status: "failed",
    error_message: errorMessage,
    duration_ms: durationMs ?? null,
  };
  
  console.log("[orchestrate-report] 📝 ATTEMPTING TO LOG FAILED ATTEMPT:", {
    user_id: logData.user_id,
    report_type: logData.report_type,
    engine_used: logData.engine_used,
    status: logData.status,
    error_message: logData.error_message,
    duration_ms: logData.duration_ms
  });

  try {
    const { error } = await supabase.from("report_logs").insert(logData);
    
    if (error) {
      console.error("[orchestrate-report] ❌ FAILED ATTEMPT LOG INSERT ERROR:", error);
      throw error;
    }
    
    console.log("[orchestrate-report] ✅ SUCCESSFULLY LOGGED FAILED ATTEMPT.");
  } catch (error) {
    console.error("[orchestrate-report] ❌ Failed to log failed attempt:", error);
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
  console.log("[orchestrate-report] 🟢 Processing report request:", {
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    is_guest: payload.is_guest,
  });
  
  const start = Date.now();
  const supabase = initSupabase();

  const v = await validateRequest(supabase, payload);
  if (!v.ok) {
    console.warn(`[orchestrate-report] 🔴 Validation failed: ${v.reason}`);
    await logFailedAttempt(supabase, payload, "validator", v.reason, Date.now() - start);
    return { success: false, errorMessage: v.reason };
  }

  const engine = await getNextEngine(supabase);

  let reportContent = "";
  try {
    const edgeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${engine}`;
    const requestPayload = { ...payload, reportType: payload.report_type, selectedEngine: engine };
    
    console.log("[orchestrate-report] 🌐 Calling edge function:", engine);
    
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[orchestrate-report] ❌ Edge function failed:", errText);
      await logFailedAttempt(supabase, payload, engine, errText, Date.now() - start);
      return { success: false, errorMessage: errText };
    }

    const json = await response.json();
    reportContent = json.report?.content ?? json.report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[orchestrate-report] ❌ Exception during edge function call:", msg);
    await logFailedAttempt(supabase, payload, engine, msg, Date.now() - start);
    return { success: false, errorMessage: msg };
  }

  const user_id = payload.user_id;

  const successLogData = {
    api_key: payload.apiKey ?? null,
    user_id: user_id,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: engine,
    report_text: reportContent,
    status: "success",
    duration_ms: Date.now() - start,
  };

  console.log("🔍 [orchestrate-report] SUCCESS LOG INSERT DEBUG:", {
    user_id: successLogData.user_id,
    user_id_type: typeof successLogData.user_id,
    user_id_length: successLogData.user_id ? successLogData.user_id.length : 0,
    is_guest: payload.is_guest,
    successLogData_keys: Object.keys(successLogData),
    function: "orchestrate-report:success_insert"
  });
  
  console.log("[orchestrate-report] 📝 ATTEMPTING TO LOG SUCCESS TO report_logs:", {
    user_id: successLogData.user_id,
    report_type: successLogData.report_type,
    engine_used: successLogData.engine_used,
    status: successLogData.status,
    duration_ms: successLogData.duration_ms,
    report_text_length: successLogData.report_text?.length || 0
  });

  try {
    const { error } = await supabase.from("report_logs").insert(successLogData);
    
    if (error) {
      console.error("[orchestrate-report] ❌ SUCCESS LOG INSERT ERROR:", error);
      throw error;
    }
    
    console.log("[orchestrate-report] ✅ SUCCESSFULLY LOGGED TO report_logs:", {
      user_id: successLogData.user_id,
      report_type: successLogData.report_type,
      status: successLogData.status,
    });
  } catch (error) {
    console.error("[orchestrate-report] ❌ Failed to save success log:", error);
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
  
  console.log("[orchestrate-report] 🎉 Report generation completed:", {
    title: finalResult.report.title,
    contentLength: finalResult.report.content?.length || 0,
    engine: finalResult.report.engine_used,
  });

  return finalResult;
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, reason: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  // Check for internal call header
  const internalCall = req.headers.get('X-Internal-Call');
  if (internalCall !== 'true') {
    console.warn("[orchestrate-report] ⚠️ External call detected - missing X-Internal-Call header");
    return new Response(
      JSON.stringify({ ok: false, reason: 'Internal function only' }),
      { 
        status: 403, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    const body = await req.json();
    console.log(`[orchestrate-report][${requestId}] Processing orchestration request:`, {
      report_type: body.report_type,
      endpoint: body.endpoint,
      user_id: body.user_id,
      is_guest: body.is_guest
    });

    const result = await processReportRequest(body);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return handleError(error, {
      function: 'orchestrate-report',
      operation: 'request_processing',
      request_id: requestId
    });
  }
});
