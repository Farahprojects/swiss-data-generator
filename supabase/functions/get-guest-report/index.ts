
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { handleError, corsHeaders } from '../_shared/errorHandler.ts';

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

    if (!guestReportId) {
      return handleError(
        new Error('Guest report ID is required'), 
        { 
          function: 'get-guest-report', 
          operation: 'validate_input',
          request_id: requestId 
        },
        400,
        'Please provide a valid report ID to access your report.',
        ['Check your email for the correct report link', 'Verify the URL contains a guest_id parameter']
      );
    }

    console.log(`[get-guest-report] Looking up guest report: ${guestReportId} (Request: ${requestId})`);

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
      console.log(`[get-guest-report] Guest report not found: ${guestReportId} (Request: ${requestId})`);
      
      // Check if it's a malformed UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guestReportId)) {
        return handleError(
          new Error('Invalid guest report ID format'), 
          { 
            function: 'get-guest-report', 
            operation: 'validate_id',
            request_id: requestId,
            guest_id: guestReportId
          },
          400,
          'The report ID appears to be invalid.',
          ['Check your email for the correct report link', 'Make sure you copied the full URL']
        );
      }

      return handleError(
        new Error('Guest report not found'), 
        { 
          function: 'get-guest-report', 
          operation: 'fetch_guest_report',
          request_id: requestId,
          guest_id: guestReportId
        },
        404,
        'We could not find a report with this ID.',
        [
          'Check your email for the correct report link',
          'Verify you completed the payment process',
          'Try the link from your confirmation email',
          'Contact support if you believe this is an error'
        ]
      );
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
      return handleError(
        new Error('Payment required'), 
        { 
          function: 'get-guest-report', 
          operation: 'check_payment',
          request_id: requestId,
          guest_id: guestReportId,
          payment_status: guestReport.payment_status
        },
        402,
        'Payment is required to access this report.',
        ['Complete your payment to access the report', 'Check your payment confirmation email']
      );
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

    // If report is still processing, return appropriate message
    if (reportStatus === 'processing') {
      return handleError(
        new Error('Report is still being generated'), 
        { 
          function: 'get-guest-report', 
          operation: 'check_status',
          request_id: requestId,
          guest_id: guestReportId,
          report_type: guestReport.report_type
        },
        202, // 202 Accepted - request received but not yet acted upon
        'Your report is still being generated.',
        [
          'Please wait a few minutes and refresh the page',
          'Reports typically take 2-5 minutes to generate',
          'You will receive an email when your report is ready'
        ]
      );
    }

    if (reportStatus === 'error') {
      return handleError(
        new Error('Report generation failed'), 
        { 
          function: 'get-guest-report', 
          operation: 'check_error',
          request_id: requestId,
          guest_id: guestReportId
        },
        500,
        'There was an error generating your report.',
        [
          'Please try requesting a new report',
          'Contact support for assistance',
          'Your payment will be refunded if the error persists'
        ]
      );
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

    console.log(`[get-guest-report] Successfully returning report data (Request: ${requestId})`);
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-guest-report] Unexpected error:', error);
    return handleError(
      error,
      { 
        function: 'get-guest-report', 
        operation: 'unexpected_error',
        request_id: requestId
      },
      500,
      'An unexpected error occurred while fetching your report.',
      [
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'Contact support if the problem persists'
      ]
    );
  }
});
