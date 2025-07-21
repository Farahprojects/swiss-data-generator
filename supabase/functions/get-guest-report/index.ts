
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    swiss_boolean: boolean | null;
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    is_astro_report: boolean;
    is_ai_report: boolean;
    content_type: 'astro' | 'ai' | 'both' | 'none';
    status: 'ready' | 'processing' | 'pending_payment' | 'error';
  };
}

interface SuccessResponse {
  success: true;
  data: ReportData;
}

interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  suggestions?: string[];
  context?: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-call',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  try {
    console.log(`[get-guest-report] Request received: ${req.method} (ID: ${requestId})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let guestReportId = url.searchParams.get('id') || url.searchParams.get('guest_id');

    if (!guestReportId && req.method === 'POST') {
      try {
        const body = await req.json();
        guestReportId = body.id || body.guest_id;
      } catch {
        console.warn('[get-guest-report] No valid JSON body found');
      }
    }

    // Validate input
    if (!guestReportId) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'MISSING_ID',
        message: 'Please provide a valid report ID to access your report.',
        suggestions: [
          'Check your email for the correct report link',
          'Verify the URL contains a guest_id parameter'
        ],
        context: 'validate_input'
      };

      // Log error for debugging
      await logError(supabase, 'MISSING_ID', 'Guest report ID is required', {
        function: 'get-guest-report',
        operation: 'validate_input',
        request_id: requestId
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 200, // Always return 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guestReportId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'INVALID_ID',
        message: 'The report ID appears to be invalid.',
        suggestions: [
          'Check your email for the correct report link',
          'Make sure you copied the full URL'
        ],
        context: 'validate_id'
      };

      await logError(supabase, 'INVALID_ID', 'Invalid guest report ID format', {
        function: 'get-guest-report',
        operation: 'validate_id',
        request_id: requestId,
        guest_id: guestReportId
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[get-guest-report] Looking up guest report: ${guestReportId} (Request: ${requestId})`);

    // Fetch guest report
    const { data: guestReport, error: guestError } = await supabase
      .from('guest_reports')
      .select(`
        id,
        email,
        report_type,
        swiss_boolean,
        is_ai_report,
        payment_status,
        created_at,
        promo_code_used,
        translator_log_id,
        report_log_id,
        report_data,
        has_report,
        has_swiss_error
      `)
      .eq('id', guestReportId)
      .single();

    if (guestError || !guestReport) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'GUEST_REPORT_NOT_FOUND',
        message: 'We could not find a report with this ID.',
        suggestions: [
          'Check your email for the correct report link',
          'Verify you completed the payment process',
          'Try the link from your confirmation email',
          'Contact support if you believe this is an error'
        ],
        context: 'fetch_guest_report'
      };

      await logError(supabase, 'GUEST_REPORT_NOT_FOUND', 'Guest report not found', {
        function: 'get-guest-report',
        operation: 'fetch_guest_report',
        request_id: requestId,
        guest_id: guestReportId
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[get-guest-report] Found guest report:', {
      id: guestReport.id,
      report_type: guestReport.report_type,
      payment_status: guestReport.payment_status,
      swiss_boolean: guestReport.swiss_boolean,
      is_ai_report: guestReport.is_ai_report,
      has_report: guestReport.has_report,
      translator_log_id: !!guestReport.translator_log_id,
      report_log_id: !!guestReport.report_log_id,
      request_id: requestId
    });

    // Check payment status
    if (guestReport.payment_status !== 'paid' && guestReport.payment_status !== 'completed') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'PAYMENT_REQUIRED',
        message: 'Payment is required to access this report.',
        suggestions: [
          'Complete your payment to access the report',
          'Check your payment confirmation email'
        ],
        context: 'check_payment'
      };

      await logError(supabase, 'PAYMENT_REQUIRED', 'Payment required', {
        function: 'get-guest-report',
        operation: 'check_payment',
        request_id: requestId,
        guest_id: guestReportId,
        payment_status: guestReport.payment_status
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine report status and availability
    const hasTranslatorLog = !!guestReport.translator_log_id;
    const hasReportLog = !!guestReport.report_log_id;
    const isEssenceOrSyncReport = ['essence', 'sync'].includes(guestReport.report_type);
    
    let reportStatus: 'ready' | 'processing' | 'pending_payment' | 'error' = 'processing';
    
    if (guestReport.has_swiss_error) {
      reportStatus = 'error';
    } else if (isEssenceOrSyncReport && hasTranslatorLog) {
      reportStatus = 'ready';
    } else if (!isEssenceOrSyncReport && hasReportLog) {
      reportStatus = 'ready';
    } else if (guestReport.has_report) {
      reportStatus = 'ready';
    }

    // If report is still processing, return processing status
    if (reportStatus === 'processing') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'REPORT_PROCESSING',
        message: 'Your report is still being generated.',
        suggestions: [
          'Please wait a few minutes and refresh the page',
          'Reports typically take 2-5 minutes to generate',
          'You will receive an email when your report is ready'
        ],
        context: 'check_status'
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (reportStatus === 'error') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'REPORT_GENERATION_ERROR',
        message: 'There was an error generating your report.',
        suggestions: [
          'Please try requesting a new report',
          'Contact support for assistance',
          'Your payment will be refunded if the error persists'
        ],
        context: 'check_error'
      };

      await logError(supabase, 'REPORT_GENERATION_ERROR', 'Report generation failed', {
        function: 'get-guest-report',
        operation: 'check_error',
        request_id: requestId,
        guest_id: guestReportId
      });

      return new Response(JSON.stringify(errorResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let reportContent: string | null = null;
    let swissData: any | null = null;

    // Fetch Swiss astro data first (if translator log exists)
    if (hasTranslatorLog) {
      const { data: translatorLog, error: translatorError } = await supabase
        .from('translator_logs')
        .select('swiss_data')
        .eq('id', guestReport.translator_log_id)
        .single();

      if (!translatorError) {
        swissData = translatorLog?.swiss_data || null;
        console.log('[get-guest-report] [SWISS-DATA-ACCESS] Swiss data fetched successfully');
      } else {
        console.error('[get-guest-report] Error fetching Swiss data:', translatorError);
      }
    }

    // Determine report types based on actual data and report_type
    const isAstroReport = !!swissData;
    const isAiReport = guestReport.is_ai_report && !!guestReport.report_log_id;

    // Extract content based on report type - prioritize AI reports from report_logs
    if (isAiReport) {
      console.log('[get-guest-report] [CONTAMINATION-FIX] Fetching AI report from report_logs table');
      const { data: reportLog, error: reportError } = await supabase
        .from('report_logs')
        .select('report_text')
        .eq('id', guestReport.report_log_id)
        .single();

      if (!reportError) {
        reportContent = reportLog?.report_text || null;
        console.log('[get-guest-report] [CONTAMINATION-FIX] Successfully fetched AI report from report_logs');
      } else {
        console.error('[get-guest-report] Error fetching AI report:', reportError);
      }
    } else if (isEssenceOrSyncReport && swissData?.report?.content) {
      console.log('[get-guest-report] [LEGACY] Warning: Found report content in swiss_data (should be pure now)');
      reportContent = swissData.report.content;
    }

    let contentType: 'astro' | 'ai' | 'both' | 'none' = 'none';
    if (isAstroReport && isAiReport) contentType = 'both';
    else if (isAstroReport) contentType = 'astro';
    else if (isAiReport) contentType = 'ai';

    const responseData: ReportData = {
      guest_report: {
        id: guestReport.id,
        email: guestReport.email,
        report_type: guestReport.report_type,
        swiss_boolean: guestReport.swiss_boolean,
        is_ai_report: guestReport.is_ai_report,
        payment_status: guestReport.payment_status,
        created_at: guestReport.created_at,
        promo_code_used: guestReport.promo_code_used,
        report_data: guestReport.report_data,
      },
      report_content: reportContent,
      swiss_data: swissData,
      metadata: {
        is_astro_report: isAstroReport,
        is_ai_report: isAiReport,
        content_type: contentType,
        status: reportStatus,
      },
    };

    const successResponse: SuccessResponse = {
      success: true,
      data: responseData
    };

    console.log(`[get-guest-report] Successfully returning report data (Request: ${requestId})`);
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[get-guest-report] Unexpected error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching your report.',
      suggestions: [
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'Contact support if the problem persists'
      ],
      context: 'unexpected_error'
    };

    // Try to log the error, but don't fail if logging fails
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await logError(supabase, 'INTERNAL_ERROR', error.message, {
        function: 'get-guest-report',
        operation: 'unexpected_error',
        request_id: requestId,
        stack: error.stack
      });
    } catch (logErr) {
      console.error('[get-guest-report] Failed to log error:', logErr);
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Still return 200 even for unexpected errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to log errors to debug_logs
async function logError(
  supabase: any,
  code: string,
  message: string,
  context: Record<string, any>
) {
  try {
    await supabase.from('debug_logs').insert({
      source: 'get-guest-report',
      message: `[${code}] ${message}`,
      user_id: context.guest_id || null,
      details: {
        ...context,
        timestamp: new Date().toISOString()
      }
    });
  } catch (logError) {
    console.error('[get-guest-report] Failed to log error:', logError);
  }
}
