
// Shared report generation handler
// Ensures consistent report generation across all endpoints

import { processReportRequest } from "./reportOrchestrator.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReportHandlerParams {
  requestData: any;
  swissApiResponse: any;
  swissApiStatus: number;
  requestId?: string;
}

interface ReportHandlerResult {
  success: boolean;
  responseData: any;
  aiOnlyData?: any;
  errorMessage?: string;
}

/**
 * Unified report generation handler
 * Processes report requests after successful Swiss API calls
 * Ensures payment and report generation are always coupled
 */
export async function handleReportGeneration(params: ReportHandlerParams): Promise<ReportHandlerResult> {
  const { requestData, swissApiResponse, swissApiStatus, requestId } = params;
  const logPrefix = requestId ? `[reportHandler][${requestId}]` : "[reportHandler]";
  
  console.log(`${logPrefix} ========== REPORT GENERATION DEBUG START ==========`);
  console.log(`${logPrefix} Swiss API Status: ${swissApiStatus}`);
  console.log(`${logPrefix} Request Data Keys: ${Object.keys(requestData || {}).join(', ')}`);
  console.log(`${logPrefix} Report field in request: ${JSON.stringify(requestData?.report)}`);
  console.log(`${logPrefix} Report field type: ${typeof requestData?.report}`);
  console.log(`${logPrefix} Report field truthiness: ${!!requestData?.report}`);
  
  // Only proceed if Swiss API call was successful
  if (swissApiStatus !== 200) {
    console.log(`${logPrefix} Swiss API failed (${swissApiStatus}), skipping report generation`);
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    return {
      success: true,
      responseData: swissApiResponse
    };
  }

  // Check if this is an AstroData request (raw Swiss data only)
  const isAstroDataRequest = requestData?.request === 'essence' || requestData?.request === 'sync';
  
  // Enhanced report request checking with detailed logging
  const reportRequested = requestData?.report;
  console.log(`${logPrefix} Raw report field value: "${reportRequested}"`);
  console.log(`${logPrefix} Report requested check: ${reportRequested ? 'YES' : 'NO'}`);
  console.log(`${logPrefix} AstroData request check: ${isAstroDataRequest ? 'YES' : 'NO'}`);
  
  if (!reportRequested) {
    if (isAstroDataRequest) {
      console.log(`${logPrefix} AstroData request detected - returning raw Swiss data without report generation`);
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      return {
        success: true,
        responseData: swissApiResponse
      };
    }
    
    console.warn(`${logPrefix} No report requested - request payload:`, {
      hasReportField: 'report' in (requestData || {}),
      reportValue: requestData?.report,
      allFields: Object.keys(requestData || {})
    });
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    return {
      success: true,
      responseData: swissApiResponse,
      errorMessage: "No report field found in request or report field is empty/falsy"
    };
  }

  console.log(`${logPrefix} Report requested: "${reportRequested}", proceeding with generation...`);

  try {
    // Parse Swiss API response with enhanced logging
    let swissData;
    console.log(`${logPrefix} Swiss API response type: ${typeof swissApiResponse}`);
    console.log(`${logPrefix} Swiss API response preview (first 200 chars): ${JSON.stringify(swissApiResponse).substring(0, 200)}...`);
    
    try {
      swissData = typeof swissApiResponse === 'string' ? JSON.parse(swissApiResponse) : swissApiResponse;
      console.log(`${logPrefix} Successfully parsed Swiss API response. Keys: ${Object.keys(swissData || {}).join(', ')}`);
    } catch (parseError) {
      console.error(`${logPrefix} Failed to parse Swiss API response:`, parseError);
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      return {
        success: false,
        responseData: swissApiResponse,
        errorMessage: "Unable to process Swiss API response for report generation - invalid JSON format"
      };
    }

    // Resolve API key for guest reports
    let resolvedApiKey = requestData.api_key;
    
    // Check if this is a guest report (has user_id but no api_key)
    if (!resolvedApiKey && requestData.user_id) {
      console.log(`${logPrefix} Guest report detected, checking for valid Stripe session...`);
      
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        const { data: guestReport, error } = await supabase
          .from("guest_reports")
          .select("stripe_session_id")
          .eq("id", requestData.user_id)
          .single();
        
        if (error) {
          console.error(`${logPrefix} Failed to query guest_reports:`, error);
          resolvedApiKey = null;
        } else if (guestReport?.stripe_session_id) {
          console.log(`${logPrefix} Valid Stripe session found for guest report`);
          resolvedApiKey = "GUEST-STRIPE";
        } else {
          console.log(`${logPrefix} No valid Stripe session found for guest report`);
          resolvedApiKey = null;
        }
      } catch (error) {
        console.error(`${logPrefix} Error resolving guest API key:`, error);
        resolvedApiKey = null;
      }
    }
    
    console.log(`${logPrefix} Resolved API key: ${resolvedApiKey ? 'present' : 'missing'} (${resolvedApiKey})`);

    // Determine if this is a guest user by checking for stripe_session_id in requestData
    const isGuest = !!(requestData.stripe_session_id || resolvedApiKey === "GUEST-STRIPE");

    // Prepare report payload with enhanced logging and embedded person names
    const reportPayload = {
      endpoint: requestData.request || "unknown",
      report_type: requestData.report,
      user_id: requestData.user_id,
      apiKey: resolvedApiKey,
      is_guest: isGuest,
      chartData: {
        ...swissData,
        person_a_name: requestData.person_a?.name,
        person_b_name: requestData.person_b?.name
      },
      // Include any other relevant data from the request
      ...requestData
    };

    console.log(`${logPrefix} Report payload prepared with embedded names:`, {
      endpoint: reportPayload.endpoint,
      report_type: reportPayload.report_type,
      user_id: reportPayload.user_id ? 'present' : 'missing',
      apiKey: reportPayload.apiKey ? 'present' : 'missing',
      is_guest: reportPayload.is_guest,
      chartData: reportPayload.chartData ? 'present' : 'missing',
      chartDataKeys: reportPayload.chartData ? Object.keys(reportPayload.chartData).join(', ') : 'none',
      person_a_name: reportPayload.chartData.person_a_name || 'not provided',
      person_b_name: reportPayload.chartData.person_b_name || 'not provided'
    });

    // Validate report type before calling orchestrator
    if (!reportPayload.report_type || typeof reportPayload.report_type !== 'string') {
      console.error(`${logPrefix} Invalid report type:`, {
        value: reportPayload.report_type,
        type: typeof reportPayload.report_type
      });
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      return {
        success: true,
        responseData: {
          ...swissData,
          report_error: `Invalid report type: ${reportPayload.report_type}`
        },
        errorMessage: `Invalid report type provided: ${reportPayload.report_type}`
      };
    }

    console.log(`${logPrefix} Calling report orchestrator for "${reportPayload.report_type}" report...`);
    
    // Add this to flush payload before it goes in:
    console.log(`${logPrefix} Payload being sent to orchestrator:`, JSON.stringify(reportPayload, null, 2));
    
    // Generate the report
    const reportResult = await processReportRequest(reportPayload);
    
    console.log(`${logPrefix} Report orchestrator response:`, {
      success: reportResult.success,
      hasReport: !!reportResult.report,
      errorMessage: reportResult.errorMessage,
      reportPreview: reportResult.report ? 'Report generated successfully' : 'No report in response'
    });
    
    if (reportResult.success && reportResult.report) {
      console.log(`${logPrefix} Report generated successfully for "${reportPayload.report_type}"`);
      
      // [CONTAMINATION-POINT-1] Adding report to swiss_data in reportHandler
      console.log(`${logPrefix} [CONTAMINATION-POINT-1] Adding report to swiss_data in reportHandler - Line 208`);
      console.log(`${logPrefix} [CONTAMINATION-POINT-1] Report keys being added:`, Object.keys(reportResult.report || {}));
      console.log(`${logPrefix} [CONTAMINATION-POINT-1] Swiss data keys before contamination:`, Object.keys(swissData || {}));
      
      // [CONTAMINATION-ALERT-REPORTHANDLER] Creating contaminated structure
      console.log(`${logPrefix} [CONTAMINATION-ALERT-REPORTHANDLER] guest_id: ${params.requestData.guest_id || 'unknown'} - Creating contaminated structure`);
      console.log(`${logPrefix} [CONTAMINATION-ALERT-REPORTHANDLER] About to combine clean swiss_data with report content`);
      
      // Combine Swiss API data with the report and include engine_used
      const combinedResponse = {
        swiss_data: swissData,  // Keep Swiss data nested and pure
        report: reportResult.report,
        engine_used: reportResult.report.engine_used // <- Engine info from report generation
      };
      
      console.log(`${logPrefix} [CONTAMINATION-POINT-1] Combined response keys after contamination:`, Object.keys(combinedResponse || {}));
      
      // Create AI-only data for logging (without Swiss data)
      const aiOnlyData = {
        report: reportResult.report,
        engine_used: reportResult.report.engine_used
      };
      
      console.log(`${logPrefix} Combined response prepared with report and engine info included`);
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      
      return {
        success: true,
        responseData: combinedResponse,
        aiOnlyData: aiOnlyData,
        errorMessage: undefined
      };
    } else {
      const errorMsg = reportResult.errorMessage || "Report generation failed without specific error";
      console.error(`${logPrefix} Report generation failed:`, {
        orchestratorSuccess: reportResult.success,
        errorMessage: errorMsg,
        reportType: reportPayload.report_type
      });
      
      // Return Swiss API data with detailed error message about report
      const responseWithError = {
        ...swissData,
        report_error: `Failed to generate ${reportPayload.report_type} report: ${errorMsg}`
      };
      
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      
      return {
        success: true,
        responseData: responseWithError,
        errorMessage: `Report generation failed for ${reportPayload.report_type}: ${errorMsg}`
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} Unexpected error in report generation:`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      reportType: requestData?.report
    });
    
    // Parse Swiss data for error response if possible
    let swissData;
    try {
      swissData = typeof swissApiResponse === 'string' ? JSON.parse(swissApiResponse) : swissApiResponse;
    } catch {
      swissData = { raw_response: swissApiResponse };
    }
    
    // Return Swiss API data with error message
    const responseWithError = {
      ...swissData,
      report_error: `Unexpected error during ${requestData?.report || 'unknown'} report generation: ${errorMsg}`
    };
    
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    
    return {
      success: true,
      responseData: responseWithError,
      errorMessage: `Unexpected error generating ${requestData?.report || 'unknown'} report: ${errorMsg}`
    };
  }
}
