
// Report orchestrator utility
// Handles report processing workflow including balance checks and report generation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Available edge engines for round-robin load balancing
const EDGE_ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
];

// Database-based round-robin engine selection
async function getNextEngine(supabase: any) {
  try {
    console.log(`[reportOrchestrator] Selecting next engine using database-based round-robin`);
    
    // Use simple round-robin without database dependency
    const now = Date.now();
    const nextEngineIndex = Math.floor(now / 1000) % EDGE_ENGINES.length;
    console.log(`[reportOrchestrator] Using time-based round-robin, selected index: ${nextEngineIndex}`);
    
    let nextEngineIndex_final = nextEngineIndex; // Default using time-based round-robin
    
    const selectedEngine = EDGE_ENGINES[nextEngineIndex_final];
    console.log(`[reportOrchestrator] Selected engine: ${selectedEngine} (index: ${nextEngineIndex_final}/${EDGE_ENGINES.length - 1})`);
    
    return selectedEngine;
  } catch (error) {
    console.error(`[reportOrchestrator] Unexpected error in getNextEngine: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`[reportOrchestrator] Falling back to first engine due to error`);
    return EDGE_ENGINES[0];
  }
}

// Initialize Supabase client
const initSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[reportOrchestrator] Missing Supabase credentials");
    throw new Error("Missing Supabase credentials");
  }

  console.log(`[reportOrchestrator] Initializing Supabase client with URL: ${supabaseUrl}`);
  console.log(`[reportOrchestrator] Service key format check: ${supabaseServiceKey.startsWith("eyJ") ? "Correct" : "Incorrect"} format`);
  
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[reportOrchestrator] Supabase client successfully initialized`);
    return client;
  } catch (error) {
    console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨: Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

interface ReportPayload {
  endpoint: string;
  report_type: string; 
  user_id: string;
  apiKey: string;
  chartData: any; // Swiss API response data
  [key: string]: any; // Other properties
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
  console.log(`[reportOrchestrator] Processing ${payload.report_type} report request for endpoint: ${payload.endpoint}`);
  const startTime = Date.now();
  
  try {
    // Step 1: Initialize Supabase client
    let supabase;
    try {
      supabase = initSupabase();
    } catch (initError) {
      console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨: Failed to initialize Supabase: ${initError instanceof Error ? initError.message : String(initError)}`);
      return {
        success: false,
        errorMessage: "Authentication error when initializing database connection"
      };
    }

    // Step 2: Dynamic validation - check if report type exists in report_prompts table
    try {
      const { data: promptExists, error: promptError } = await supabase
        .from("report_prompts")
        .select("name")
        .eq("name", payload.report_type)
        .maybeSingle();
      
      if (promptError) {
        if (promptError.message?.includes("JWT")) {
          console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 in prompt validation: ${promptError.message}`);
        } else {
          console.error(`[reportOrchestrator] Error validating report type: ${promptError.message}`);
        }
        throw promptError;
      }
      
      if (!promptExists) {
        console.error(`[reportOrchestrator] Invalid report type: ${payload.report_type}`);
        return { 
          success: false, 
          errorMessage: `Report type '${payload.report_type}' not found. Please check available report types.` 
        };
      }
      
      console.log(`[reportOrchestrator] Report type '${payload.report_type}' validated successfully`);
    } catch (dbError) {
      if (String(dbError).includes("JWT")) {
        console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 during report type validation: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      } else {
        console.error(`[reportOrchestrator] Database error during validation: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
      return {
        success: false,
        errorMessage: "Error validating report type"
      };
    }

    // Step 3: Get cost from price_list using the actual report_type
    try {
      const { data: priceData, error: priceError } = await supabase
        .from("price_list")
        .select("unit_price_usd")
        .eq("id", payload.report_type)
        .maybeSingle();
      
      if (priceError) {
        if (priceError.message?.includes("JWT")) {
          console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 in price fetch: ${priceError.message}`);
        } else {
          console.error(`[reportOrchestrator] Error fetching price: ${priceError.message}`);
        }
        throw priceError;
      }
      
      if (!priceData) {
        console.error(`[reportOrchestrator] No price found for ${payload.report_type} report`);
        return {
          success: false,
          errorMessage: "Could not determine report price"
        };
      }
      
      const reportCost = priceData.unit_price_usd;
      console.log(`[reportOrchestrator] ${payload.report_type} report cost: ${reportCost}`);
    } catch (dbError) {
      if (String(dbError).includes("JWT")) {
        console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 during database query: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      } else {
        console.error(`[reportOrchestrator] Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
      return {
        success: false,
        errorMessage: "Error retrieving pricing information"
      };
    }
    
    // Trust the payload for user_id instead of checking balances
    const userId = payload.user_id;
    
    // Step 4: Generate the report
    const report = await generateReport(payload, supabase);
    
    if (!report.success) {
      return {
        success: false,
        errorMessage: report.errorMessage || "Failed to generate report"
      };
    }
    
    // Report logging is now solely the responsibility of the edge function
    console.log(`[reportOrchestrator] Successfully generated ${payload.report_type} report for user: ${userId}`);
    
    return {
      success: true,
      report: report.data
    };
  } catch (err) {
    // Check for JWT errors specifically
    if (String(err).includes("JWT") || String(err).includes("401")) {
      console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨: ${err instanceof Error ? err.message : String(err)}`);
    } else {
      console.error(`[reportOrchestrator] Unexpected error:`, err);
    }
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorMessage
    };
  }
};

/**
 * Generate the appropriate report based on type
 * This will call the standard or premium report generation function
 */
async function generateReport(payload: ReportPayload, supabase: any) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      console.error(`[reportOrchestrator] Missing SUPABASE_URL environment variable`);
      throw new Error("Missing SUPABASE_URL environment variable");
    }
    
    // Select next engine using database-based round-robin
    const selectedEngine = await getNextEngine(supabase);
    console.log(`[reportOrchestrator] Using engine '${selectedEngine}' for ${payload.report_type} report`);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${selectedEngine}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No Authorization header as verify_jwt = false in config.toml
        },
        body: JSON.stringify({
          ...payload,
          reportType: payload.report_type, // Pass the actual report type
          selectedEngine: selectedEngine // Pass the selected engine so it can be logged
        })
      });
      
      // Improved error handling for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        
        if (status === 401 || errorText.includes("JWT")) {
          console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 from ${selectedEngine} function: ${status} - ${errorText}`);
          return {
            success: false,
            errorMessage: `JWT authentication error (401): ${errorText}`
          };
        } else {
          console.error(`[reportOrchestrator] Error from ${selectedEngine} function: ${status} - ${errorText}`);
          return {
            success: false,
            errorMessage: `Report generation failed with status ${status}: ${errorText}`
          };
        }
      }
      
      const reportResult = await response.json();
      console.log(`[reportOrchestrator] Successfully received ${payload.report_type} report from ${selectedEngine} function`);
      
      return {
        success: true,
        data: {
          title: `${payload.report_type.charAt(0).toUpperCase() + payload.report_type.slice(1)} ${payload.endpoint} Report`,
          content: reportResult.report,
          generated_at: new Date().toISOString(),
          engine_used: selectedEngine // Track which engine was used
        }
      };
    } catch (fetchErr) {
      if (String(fetchErr).includes("JWT") || String(fetchErr).includes("401")) {
        console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 calling ${selectedEngine}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      } else {
        console.error(`[reportOrchestrator] Fetch error calling ${selectedEngine}:`, fetchErr);
      }
      return {
        success: false,
        errorMessage: `Network error calling ${selectedEngine} service: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
      };
    }
  } catch (err) {
    if (String(err).includes("JWT") || String(err).includes("401")) {
      console.error(`[reportOrchestrator] 🚨 JWT ERROR 🚨 generating report: ${err instanceof Error ? err.message : String(err)}`);
    } else {
      console.error(`[reportOrchestrator] Error generating report:`, err);
    }
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err)
    };
  }
}
