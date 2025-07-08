
// Report orchestrator utility
// Handles report processing workflow including balance checks and report generation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Available edge engines for round-robin load balancing
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
  "standard-report-three",
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

// UUID validation helper with logging
function isUUID(value: string): boolean {
  const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (!isValid) {
    console.warn(`[orchestrator] Invalid UUID format: ${value}`);
  }
  return isValid;
}

// Smart user identity resolution: signed-in user or guest with Stripe
async function resolveUserId(supabase: any, userId: string | null): Promise<{ userId: string | null, userType: string | null, error?: string }> {
  if (!userId) {
    return { userId: null, userType: null };
  }

  if (!isUUID(userId)) {
    console.warn(`[orchestrator] Invalid user ID format: ${userId}`);
    return { userId: null, userType: null, error: "Invalid user ID format" };
  }

  console.log(`[orchestrator] Resolving user identity for: ${userId}`);

  // Check if it's a real auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  
  if (authUser?.user && !authError) {
    console.log(`[orchestrator] Resolved as authenticated user: ${userId}`);
    return { userId, userType: "authenticated" };
  }

  // Otherwise check if it's a guest user with completed payment
  const { data: guest, error: guestError } = await supabase
    .from("guest_reports")
    .select("stripe_session_id, payment_status")
    .eq("id", userId)
    .maybeSingle();

  if (guestError) {
    console.error(`[orchestrator] Error checking guest reports: ${guestError.message}`);
    return { userId: null, userType: null, error: "Database error during user resolution" };
  }

  if (guest?.stripe_session_id && guest?.payment_status === 'completed') {
    console.log(`[orchestrator] Resolved as paid guest user: ${userId}`);
    return { userId, userType: "guest" };
  }

  if (guest && (!guest.stripe_session_id || guest.payment_status !== 'completed')) {
    console.warn(`[orchestrator] Guest user found but payment not completed: ${userId}`);
    return { userId: null, userType: null, error: "Guest payment not completed" };
  }

  console.warn(`[orchestrator] User not found in auth or guest tables: ${userId}`);
  return { userId: null, userType: null, error: "User not found" };
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

  // Resolve and validate user identity
  const userResolution = await resolveUserId(supabase, payload.user_id ?? null);
  if (userResolution.error) {
    console.error(`[orchestrator] User resolution failed: ${userResolution.error}`);
    return { success: false, errorMessage: userResolution.error };
  }

  const userId = userResolution.userId;
  console.log(`[orchestrator] User resolved - ID: ${userId}, Type: ${userResolution.userType}`);

  const report = await generateReport(payload, supabase);
  if (!report.success) return { success: false, errorMessage: report.errorMessage };

  // Insert into report_logs - orchestrator is now responsible for all logging
  const { data: logData, error: logError } = await supabase.from("report_logs").insert({
    api_key: payload.apiKey ?? null,
    user_id: userId,
    report_type: payload.report_type,
    endpoint: payload.endpoint,
    engine_used: report.report.engine_used,
    report_text: report.report.content,
    status: 'success',
    created_at: new Date().toISOString(),
  });

  if (logError) {
    console.error(`[orchestrator] Failed to insert report_logs:`, logError.message, logError);
  } else {
    console.log(`[orchestrator] Successfully inserted report_logs for ${payload.report_type}/${payload.endpoint} using ${report.report.engine_used}`);
  }

  return { success: true, report: report.report };
};

/**
 * Generate the appropriate report based on type
 * This will call the standard or premium report generation function
 */
async function generateReport(payload: ReportPayload, supabase: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const selectedEngine = await getNextEngine(supabase);

  console.log(`[orchestrator] Calling ${selectedEngine} for ${payload.report_type}/${payload.endpoint}`);

  try {
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
      console.error(`[orchestrator] ${selectedEngine} returned error:`, response.status, errorText);
      
      // Log failed attempt to report_logs
      await logFailedAttempt(supabase, payload, selectedEngine, errorText);
      
      return { success: false, errorMessage: errorText };
    }

    const reportResult = await response.json();
    
    // Handle different response structures from edge functions
    let reportContent;
    if (reportResult.report?.content) {
      // New structure: { success: true, report: { content: "...", title: "...", generated_at: "...", engine_used: "..." } }
      reportContent = reportResult.report.content;
    } else if (typeof reportResult.report === 'string') {
      // Legacy structure: { success: true, report: "report text..." }
      reportContent = reportResult.report;
    } else {
      console.error(`[orchestrator] Unexpected response structure from ${selectedEngine}:`, reportResult);
      return { success: false, errorMessage: "Invalid response structure from report engine" };
    }

    console.log(`[orchestrator] Successfully generated report using ${selectedEngine}`);
    
    return {
      success: true,
      report: {
        title: `${payload.report_type} ${payload.endpoint} Report`,
        content: reportContent,
        generated_at: new Date().toISOString(),
        engine_used: selectedEngine,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during report generation";
    console.error(`[orchestrator] Exception calling ${selectedEngine}:`, error);
    
    // Log failed attempt to report_logs
    await logFailedAttempt(supabase, payload, selectedEngine, errorMessage);
    
    return { success: false, errorMessage };
  }
}

// Helper function to log failed report attempts
async function logFailedAttempt(supabase: any, payload: ReportPayload, engine: string, errorMessage: string) {
  try {
    // Use the same user resolution logic for failed attempts
    const userResolution = await resolveUserId(supabase, payload.user_id ?? null);
    const userId = userResolution.userId;

    const { error: logError } = await supabase.from("report_logs").insert({
      api_key: payload.apiKey ?? null,
      user_id: userId,
      report_type: payload.report_type,
      endpoint: payload.endpoint,
      engine_used: engine,
      report_text: null,
      status: 'failed',
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      console.error(`[orchestrator] Failed to log error attempt:`, logError.message);
    } else {
      console.log(`[orchestrator] Logged failed attempt for ${payload.report_type}/${payload.endpoint} using ${engine}`);
    }
  } catch (err) {
    console.error(`[orchestrator] Exception while logging failed attempt:`, err);
  }
}
