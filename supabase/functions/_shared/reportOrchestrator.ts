
// Report orchestrator utility
// Handles report processing workflow including balance checks and report generation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Available edge engines for round-robin load balancing
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
];

// Initialize Supabase client
const initSupabase = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
};

// Database-based round-robin engine selection
async function getNextEngine(supabase: any) {
  const { data: lastReport, error } = await supabase
    .from("report_logs")
    .select("engine_used")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastReport?.engine_used) return EDGE_ENGINES[0];

  const lastIndex = EDGE_ENGINES.indexOf(lastReport.engine_used);
  return EDGE_ENGINES[(lastIndex + 1) % EDGE_ENGINES.length];
};

// UUID validation helper
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

interface ReportPayload {
  endpoint: string;
  report_type: string;
  user_id?: string;
  apiKey?: string;
  chartData: any;
  [key: string]: any;
}

interface ReportResult {
  success: boolean;
  report?: any;
  errorMessage?: string;
}

/**
 * Process a report request from the translator
 * Handles balance checks, cost estimation, and report generation
 * 
 * @param payload The normalized payload from translator
 * @returns Object containing success status and either report or error message
 */
export const processReportRequest = async (payload: ReportPayload): Promise<ReportResult> => {
  const supabase = initSupabase();

  const { data: promptExists } = await supabase
    .from("report_prompts")
    .select("name")
    .eq("name", payload.report_type)
    .maybeSingle();
  if (!promptExists) return { success: false, errorMessage: "Invalid report_type" };

  const { data: priceData } = await supabase
    .from("price_list")
    .select("unit_price_usd")
    .eq("id", payload.report_type)
    .maybeSingle();
  if (!priceData) return { success: false, errorMessage: "Could not determine report price" };

  const userId = payload.user_id ?? null;

  const report = await generateReport(payload, supabase);
  if (!report.success) return { success: false, errorMessage: report.errorMessage };

  // Insert into report_logs - orchestrator is now responsible for all logging
  await supabase.from("report_logs").insert({
    api_key: payload.apiKey ?? null,
    user_id: userId && isUUID(userId) ? userId : null,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: report.report.engine_used,
    report_text: report.report.content,
    status: 'success',
    created_at: new Date().toISOString(),
  });

  return { success: true, report: report.report };
};

/**
 * Generate the appropriate report based on type
 * This will call the standard or premium report generation function
 */
async function generateReport(payload: ReportPayload, supabase: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const selectedEngine = await getNextEngine(supabase);

  const response = await fetch(`${supabaseUrl}/functions/v1/${selectedEngine}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      reportType: payload.report_type,
      selectedEngine,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, errorMessage: errorText };
  }

  const reportResult = await response.json();
  return {
    success: true,
    report: {
      title: `${payload.report_type} ${payload.endpoint} Report`,
      content: reportResult.report,
      generated_at: new Date().toISOString(),
      engine_used: selectedEngine,
    },
  };
}
