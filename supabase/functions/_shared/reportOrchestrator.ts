
// Report orchestrator utility
// Handles report processing workflow including balance checks and report generation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkApiKeyAndBalance } from "./balanceChecker.ts";

// Initialize Supabase client
const initSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[reportOrchestrator] Missing Supabase credentials");
    throw new Error("Missing Supabase credentials");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

interface ReportPayload {
  endpoint: string;
  report_type: "standard" | "premium";
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
  
  try {
    // Step 1: Validate report type
    if (!["standard", "premium"].includes(payload.report_type)) {
      console.error(`[reportOrchestrator] Invalid report type: ${payload.report_type}`);
      return { 
        success: false, 
        errorMessage: "Invalid report type. Supported types: standard, premium" 
      };
    }

    // Step 2: Get cost from price_list
    const supabase = initSupabase();
    const { data: priceData, error: priceError } = await supabase
      .from("price_list")
      .select("unit_price_usd")
      .eq("report_tier", payload.report_type)
      .maybeSingle();
    
    if (priceError || !priceData) {
      console.error(`[reportOrchestrator] Error fetching price for ${payload.report_type} report:`, priceError?.message || "No price found");
      return {
        success: false,
        errorMessage: "Could not determine report price"
      };
    }
    
    const reportCost = priceData.unit_price_usd;
    console.log(`[reportOrchestrator] ${payload.report_type} report cost: ${reportCost}`);
    
    // Step 3: Check user balance with balanceChecker
    const { isValid, userId, hasBalance, errorMessage } = await checkApiKeyAndBalance(payload.apiKey);
    
    if (!isValid || !hasBalance) {
      console.error(`[reportOrchestrator] Balance check failed: ${errorMessage}`);
      
      // Step 4: If balance insufficient, check if user has payment method on file
      if (isValid && !hasBalance) {
        // Check if user has any stripe customer ID
        const { data: stripeData } = await supabase
          .from("stripe_users")
          .select("stripe_customer_id")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (stripeData?.stripe_customer_id) {
          // Queue auto top-up
          console.log(`[reportOrchestrator] Queuing auto top-up for user: ${userId}`);
          await supabase
            .from("topup_queue")
            .insert({
              user_id: userId,
              amount_usd: 100.00 // Use the new $100 top-up amount
            });
          
          return {
            success: false,
            errorMessage: "Your account is being topped up. Please try your request again in a few moments."
          };
        }
      }
      
      return { success: false, errorMessage: errorMessage || "Insufficient balance" };
    }
    
    // Step 5: Generate the report
    const report = await generateReport(payload);
    
    if (!report.success) {
      return {
        success: false,
        errorMessage: report.errorMessage || "Failed to generate report"
      };
    }
    
    // Step 6: Log usage is handled by the record_api_usage trigger
    console.log(`[reportOrchestrator] Successfully generated ${payload.report_type} report for user: ${userId}`);
    
    return {
      success: true,
      report: report.data
    };
  } catch (err) {
    console.error(`[reportOrchestrator] Unexpected error:`, err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err)
    };
  }
};

/**
 * Generate the appropriate report based on type
 * This will call the standard or premium report generation function
 */
async function generateReport(payload: ReportPayload) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("Missing SUPABASE_URL environment variable");
    }
    
    // For now, we'll just have placeholders for the report generation functions
    // These would be implemented in separate functions or edge functions
    if (payload.report_type === "premium") {
      // This would call premium_report() function
      console.log("[reportOrchestrator] Generating premium report");
      return {
        success: true,
        data: await mockPremiumReport(payload)
      };
    } else {
      // Call the standard-report edge function
      console.log("[reportOrchestrator] Calling standard-report edge function");
      
      // IMPORTANT CHANGE: Remove the Authorization header that was causing the JWT error
      // Since verify_jwt = false is now set in config.toml, we don't need to pass any JWT
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/standard-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Removed: "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify(payload)
        });
        
        // Improved error handling for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          const status = response.status;
          console.error(`[reportOrchestrator] Error from standard-report function: ${status} - ${errorText}`);
          
          if (status === 401) {
            return {
              success: false,
              errorMessage: `JWT authentication error (401): ${errorText}`
            };
          } else {
            return {
              success: false,
              errorMessage: `Report generation failed with status ${status}: ${errorText}`
            };
          }
        }
        
        const reportResult = await response.json();
        console.log("[reportOrchestrator] Successfully received report from standard-report function");
        
        return {
          success: true,
          data: {
            title: `Standard ${payload.endpoint} Report`,
            content: reportResult.report,
            generated_at: new Date().toISOString()
          }
        };
      } catch (fetchErr) {
        console.error(`[reportOrchestrator] Fetch error calling standard-report:`, fetchErr);
        return {
          success: false,
          errorMessage: `Network error calling report service: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
        };
      }
    }
  } catch (err) {
    console.error(`[reportOrchestrator] Error generating report:`, err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err)
    };
  }
}

// Placeholder function for premium reports that would be replaced with actual report generation logic
async function mockPremiumReport(payload: ReportPayload) {
  // In a real implementation, this would call an AI service or other logic
  return {
    title: `Premium ${payload.endpoint} Report`,
    content: "This is a placeholder for the premium report content with extended analysis",
    sections: ["Overview", "Detailed Analysis", "Recommendations"],
    generated_at: new Date().toISOString()
  };
}

