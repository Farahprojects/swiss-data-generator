
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  guest_report_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { guest_report_id }: RequestBody = await req.json();

    if (!guest_report_id) {
      console.log('❌ No guest_report_id provided');
      return new Response(
        JSON.stringify({ error: 'guest_report_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Checking report status for guest_report_id: ${guest_report_id}`);

    // Query guest_reports with all necessary joins
    const { data: guestReport, error: guestError } = await supabaseClient
      .from('guest_reports')
      .select(`
        *,
        report_logs!inner(report_text),
        translator_logs!inner(swiss_data)
      `)
      .eq('id', guest_report_id)
      .single();

    if (guestError) {
      console.log(`❌ Error fetching guest report: ${guestError.message}`);
      return new Response(
        JSON.stringify({ ready: false, data: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!guestReport) {
      console.log('❌ Guest report not found');
      return new Response(
        JSON.stringify({ ready: false, data: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check conditions for report readiness
    const hasReportLog = guestReport.has_report_log === true;
    const isSwissOnly = guestReport.is_ai_report === false && guestReport.swiss_boolean === true;
    
    console.log(`📊 Report status - has_report_log: ${hasReportLog}, is_ai_report: ${guestReport.is_ai_report}, swiss_boolean: ${guestReport.swiss_boolean}`);

    if (hasReportLog || isSwissOnly) {
      console.log('✅ Report is ready, preparing data');
      
      // Prepare the complete report data structure
      const reportData = {
        guest_report: guestReport,
        report_content: guestReport.report_logs?.report_text || null,
        swiss_data: guestReport.translator_logs?.swiss_data || null,
        metadata: {
          content_type: hasReportLog ? 'both' : 'astro',
          has_ai_report: hasReportLog,
          has_swiss_data: !!guestReport.translator_logs?.swiss_data,
          is_ready: true
        }
      };

      return new Response(
        JSON.stringify({ ready: true, data: reportData }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('⏳ Report not ready yet');
    return new Response(
      JSON.stringify({ ready: false, data: null }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in check-report-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', ready: false, data: null }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
