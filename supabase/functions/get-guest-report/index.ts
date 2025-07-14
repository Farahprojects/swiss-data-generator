import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    swiss_boolean: boolean | null; // Kept for legacy/reference but not used in final logic
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
    report_data: any; // Contains the user's form data with name, email, etc.
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    is_astro_report: boolean;
    is_ai_report: boolean;
    content_type: 'astro' | 'ai' | 'both' | 'none';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[get-guest-report] Request received: ${req.method}`);

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
      return new Response(
        JSON.stringify({ error: 'Guest report ID is required', code: 'MISSING_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        report_data
      `)
      .eq('id', guestReportId)
      .single();

    if (guestError || !guestReport) {
      return new Response(
        JSON.stringify({ error: 'Guest report not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-guest-report] Found guest report:', {
      id: guestReport.id,
      report_type: guestReport.report_type,
      swiss_boolean: guestReport.swiss_boolean,
      is_ai_report: guestReport.is_ai_report,
      translator_log_id: !!guestReport.translator_log_id,
      report_log_id: !!guestReport.report_log_id,
    });

    const hasTranslatorLog = !!guestReport.translator_log_id;

    let reportContent: string | null = null;
    let swissData: any | null = null;

    // Fetch Swiss astro data first (if translator log exists)
    if (hasTranslatorLog) {
      console.log('[get-guest-report] [DEBUG] Fetching translator log:', guestReport.translator_log_id);
      const { data: translatorLog, error: translatorError } = await supabase
        .from('translator_logs')
        .select('swiss_data')
        .eq('id', guestReport.translator_log_id)
        .single();

      if (translatorError) {
        console.error('[get-guest-report] [ERROR] Failed to fetch translator log:', translatorError);
      } else if (!translatorLog) {
        console.error('[get-guest-report] [ERROR] Translator log not found');
      } else {
        swissData = translatorLog.swiss_data || null;
        console.log('[get-guest-report] [SUCCESS] Swiss data extracted:', {
          exists: !!swissData,
          keys: swissData ? Object.keys(swissData) : 'null',
          hasReport: !!(swissData?.report),
          dataLength: swissData ? JSON.stringify(swissData).length : 0
        });
      }
    } else {
      console.log('[get-guest-report] [INFO] No translator_log_id, skipping Swiss data fetch');
    }

    // [FIX] Trust database state - don't recalculate based on data existence
    const isEssenceOrSyncReport = ['essence', 'sync'].includes(guestReport.report_type);
    const isAstroReport = guestReport.swiss_boolean; // Trust database flag
    const isAiReport = guestReport.is_ai_report; // Trust database flag

    // Extract content based on report type - prioritize AI reports from report_logs
    if (isAiReport) {
      // [CONTAMINATION-FIX] For AI reports, always fetch from report_logs (swiss_data is now pure)
      console.log('[get-guest-report] [DEBUG] Fetching AI report from report_logs table, report_log_id:', guestReport.report_log_id);
      const { data: reportLog, error: reportError } = await supabase
        .from('report_logs')
        .select('report_text')
        .eq('id', guestReport.report_log_id)
        .single();

      console.log('[get-guest-report] [DEBUG] Report log query result:', {
        error: reportError,
        data: reportLog,
        report_text_exists: !!reportLog?.report_text,
        report_text_length: reportLog?.report_text?.length || 0,
        first_100_chars: reportLog?.report_text?.substring(0, 100) || 'No content'
      });

      if (!reportError && reportLog) {
        reportContent = reportLog.report_text || null;
        console.log('[get-guest-report] [SUCCESS] AI report extracted from report_logs, length:', reportContent?.length || 0);
      } else {
        console.error('[get-guest-report] [ERROR] Failed to fetch AI report:', reportError);
        // Try to debug RLS issue by checking if the record exists at all
        const { data: checkRecord, error: checkError } = await supabase
          .from('report_logs')
          .select('id, has_error, status')
          .eq('id', guestReport.report_log_id)
          .single();
        console.log('[get-guest-report] [DEBUG] RLS check - record exists?:', {
          exists: !!checkRecord,
          error: checkError,
          record: checkRecord
        });
      }
    } else if (isEssenceOrSyncReport && swissData?.report?.content) {
      // [LEGACY] This should not happen anymore since swiss_data is pure
      console.log('[get-guest-report] [LEGACY] Warning: Found report content in swiss_data (should be pure now)');
      reportContent = swissData.report.content;
    }

    const isAstroOnly = isAstroReport && !isAiReport;

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
        is_astro_report: guestReport.swiss_boolean, // Trust database flag
        is_ai_report: guestReport.is_ai_report, // Trust database flag
        content_type: contentType,
      },
    };

    console.log('[get-guest-report] [FINAL] Response summary:', {
      has_swiss_data: !!swissData,
      has_report_content: !!reportContent,
      metadata_is_astro: responseData.metadata.is_astro_report,
      metadata_is_ai: responseData.metadata.is_ai_report,
      content_type: contentType
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-guest-report] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
