
// Shared report generation handler
// Ensures consistent report generation across all endpoints

import { processReportRequest } from "./reportOrchestrator.ts";

interface ReportHandlerParams {
  requestData: any;
  swissApiResponse: any;
  swissApiStatus: number;
  requestId?: string;
}

interface ReportHandlerResult {
  success: boolean;
  responseData: any;
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
  
  // Only proceed if Swiss API call was successful
  if (swissApiStatus !== 200) {
    console.log(`${logPrefix} Swiss API failed (${swissApiStatus}), skipping report generation`);
    return {
      success: true,
      responseData: swissApiResponse
    };
  }

  // Check if report was requested
  const reportRequested = requestData.report && ["standard", "premium"].includes(requestData.report);
  
  if (!reportRequested) {
    console.log(`${logPrefix} No report requested, returning Swiss API data only`);
    return {
      success: true,
      responseData: swissApiResponse
    };
  }

  console.log(`${logPrefix} Report requested: ${requestData.report}, processing...`);

  try {
    // Parse Swiss API response
    let swissData;
    try {
      swissData = typeof swissApiResponse === 'string' ? JSON.parse(swissApiResponse) : swissApiResponse;
    } catch (parseError) {
      console.error(`${logPrefix} Failed to parse Swiss API response:`, parseError);
      return {
        success: false,
        responseData: swissApiResponse,
        errorMessage: "Unable to process Swiss API response for report generation"
      };
    }

    // Prepare report payload
    const reportPayload = {
      endpoint: requestData.request || "unknown",
      report_type: requestData.report,
      user_id: requestData.user_id,
      apiKey: requestData.api_key,
      chartData: swissData,
      // Include any other relevant data from the request
      ...requestData
    };

    console.log(`${logPrefix} Calling report orchestrator for ${reportPayload.report_type} report`);
    
    // Generate the report
    const reportResult = await processReportRequest(reportPayload);
    
    if (reportResult.success && reportResult.report) {
      console.log(`${logPrefix} Report generated successfully`);
      
      // Combine Swiss API data with the report
      const combinedResponse = {
        ...swissData,
        report: reportResult.report
      };
      
      return {
        success: true,
        responseData: combinedResponse
      };
    } else {
      console.error(`${logPrefix} Report generation failed: ${reportResult.errorMessage}`);
      
      // Return Swiss API data with error message about report
      const responseWithError = {
        ...swissData,
        report_error: reportResult.errorMessage || "Report generation failed"
      };
      
      return {
        success: true,
        responseData: responseWithError,
        errorMessage: reportResult.errorMessage
      };
    }
  } catch (error) {
    console.error(`${logPrefix} Unexpected error in report generation:`, error);
    
    // Return Swiss API data with error message
    const responseWithError = {
      ...swissData,
      report_error: "Unexpected error during report generation"
    };
    
    return {
      success: true,
      responseData: responseWithError,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}
