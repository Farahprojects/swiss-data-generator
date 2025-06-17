
// Shared report generation handler
// Ensures consistent report generation across all endpoints

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
  errorMessage?: string;
}

/**
 * Unified report generation handler
 * Processes report requests after successful Swiss API calls
 * Queues reports for asynchronous processing
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

  // Enhanced report request checking with detailed logging
  const reportRequested = requestData?.report;
  console.log(`${logPrefix} Raw report field value: "${reportRequested}"`);
  console.log(`${logPrefix} Report requested check: ${reportRequested ? 'YES' : 'NO'}`);
  
  if (!reportRequested) {
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

  console.log(`${logPrefix} Report requested: "${reportRequested}", proceeding with queue insertion...`);

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`${logPrefix} Missing Supabase credentials`);
      return {
        success: false,
        responseData: swissApiResponse,
        errorMessage: "Missing Supabase credentials for queue insertion"
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Validate report type before queuing
    if (!reportRequested || typeof reportRequested !== 'string') {
      console.error(`${logPrefix} Invalid report type:`, {
        value: reportRequested,
        type: typeof reportRequested
      });
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      return {
        success: true,
        responseData: {
          ...swissData,
          report_error: `Invalid report type: ${reportRequested}`
        },
        errorMessage: `Invalid report type provided: ${reportRequested}`
      };
    }

    console.log(`${logPrefix} Inserting job into report_queue for "${reportRequested}" report...`);

    // Insert job into report_queue
    const { data, error } = await supabase.from("report_queue").insert({
      status: "pending",
      priority: 5,
      payload: swissData,
      report_type: reportRequested,
      endpoint: requestData.request || "unknown",
      user_id: requestData.user_id ?? null,
      attempts: 0,
      max_attempts: 3
    }).select('id').single();

    if (error) {
      console.error(`${logPrefix} Failed to insert into report_queue:`, error.message);
      
      // Return Swiss data with error message about queue insertion
      const responseWithError = {
        ...swissData,
        report_error: `Failed to queue ${reportRequested} report: ${error.message}`
      };
      
      console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
      
      return {
        success: true,
        responseData: responseWithError,
        errorMessage: `Failed to queue ${reportRequested} report: ${error.message}`
      };
    }

    console.log(`${logPrefix} Successfully queued job with ID: ${data.id}`);
    
    // Return Swiss API data with queue confirmation
    const responseWithQueue = {
      ...swissData,
      report_status: "queued",
      report_queue_id: data.id,
      message: `${reportRequested} report has been queued for processing`
    };
    
    console.log(`${logPrefix} Combined response prepared with queue confirmation`);
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    
    return {
      success: true,
      responseData: responseWithQueue
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} Unexpected error in report queue insertion:`, {
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
      report_error: `Unexpected error during ${requestData?.report || 'unknown'} report queue insertion: ${errorMsg}`
    };
    
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    
    return {
      success: true,
      responseData: responseWithError,
      errorMessage: `Unexpected error queuing ${requestData?.report || 'unknown'} report: ${errorMsg}`
    };
  }
}
