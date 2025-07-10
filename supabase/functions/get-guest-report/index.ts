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
    swiss_boolean: boolean | null;
    has_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
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
      console.error('[get-guest-report] Missing guest report ID');
      return new Response(
        JSON.stringify({ error: 'Guest report ID is required', code: 'MISSING_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-guest-report] Fetching report for ID: ${guestReportId}`);

    const { data: guestReport, error: guestError } = await supabase
      .from('guest_reports')
      .select(`
        id,
        email,
        report_type,
        swiss_boolean,
        has_report,
        payment_status,
        created_at,
        promo_code_used,
        translator_log_id,
        report_log_id
      `)
      .eq('id', guestReportId)
      .single();

    if (guestError || !guestReport) {
      console.error('[get-guest-report] Guest report not found:', guestError);
      return new Response(
        JSON.stringify({ error: 'Guest report not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-guest-report] Found guest report:', {
      id: guestReport.id,
      report_type: guestReport.report_type,
      swiss_boolean: guestReport.swiss_boolean,
      has_report: guestReport.has_report,
      translator_log_id: !!guestReport.translator_log_id,
      report_log_id: !!guestReport.report_log_id,
    });

    // Determine report type
    const isEssenceOrSyncType =
      typeof guestReport.report_type === 'string' &&
      (guestReport.report_type.includes('essence') || guestReport.report_type.includes('sync'));

    const isAstroReport =
      isEssenceOrSyncType || guestReport.swiss_boolean === true;

    const isAiReport =
      guestReport.has_report === true && !!guestReport.report_log_id;

    const hasTranslatorLog = !!guestReport.translator_log_id;

    let reportContent: string | null = null;
    let swissData: any | null = null;

    // Fetch AI report content
    if (isAiReport && guestReport.report_log_id) {
      console.log('[get-guest-report] Fetching AI report content');
      const { data: reportLog, error: reportError } = await supabase
        .from('report_logs')
        .select('report_text')
        .eq('id', guestReport.report_log_id)
        .single();

      if (reportError) {
        console.error('[get-guest-report] Error fetching AI report:', reportError);
      } else {
        reportContent = reportLog?.report_text || null;
        console.log('[get-guest-report] AI report content length:', reportContent?.length || 0);
      }
    }

    // Fetch Swiss data if available (even for AI reports)
    if (hasTranslatorLog) {
      console.log('[get-guest-report] Fetching Swiss data');
      const { data: translatorLog, error: translatorError } = await supabase
        .from('translator_logs')
        .select('swiss_data')
        .eq('id', guestReport.translator_log_id)
        .single();

      if (translatorError) {
        console.error('[get-guest-report] Error fetching Swiss data:', translatorError);
      } else {
        swissData = translatorLog?.swiss_data || null;
        console.log('[get-guest-report] Swiss data available:', !!swissData);
      }
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
        has_report: guestReport.has_report,
        payment_status: guestReport.payment_status,
        created_at: guestReport.created_at,
        promo_code_used: guestReport.promo_code_used,
      },
      report_content: reportContent,
      swiss_data: swissData,
      metadata: {
        is_astro_report: isAstroReport,
        is_ai_report: isAiReport,
        content_type: contentType,
      },
    };

    console.log('[get-guest-report] Returning data with content type:', contentType);

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
