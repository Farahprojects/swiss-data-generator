
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

    // Helper function to log errors to debug_logs
    const logError = async (context: string, message: string, details: any = {}) => {
      try {
        await supabaseClient.from('debug_logs').insert({
          source: 'check-report-status',
          message: `[${context}] ${message}`,
          details: { ...details }
        });
      } catch (logErr) {
        console.error('Failed to log to debug_logs:', logErr);
      }
    };

    const { guest_report_id }: RequestBody = await req.json();

    if (!guest_report_id) {
      await logError('VALIDATION_ERROR', 'No guest_report_id provided', { request_body: await req.text() });
      return new Response(
        JSON.stringify({ ok: false, ready: false, reason: 'guest_report_id is required' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Checking report status for guest_report_id: ${guest_report_id}`);

    // Query guest_reports with optional joins to handle missing logs gracefully
    const { data: guestReport, error: guestError } = await supabaseClient
      .from('guest_reports')
      .select(`
        *,
        report_logs(report_text),
        translator_logs(swiss_data)
      `)
      .eq('id', guest_report_id)
      .maybeSingle();

    if (guestError) {
      await logError('DATABASE_QUERY_ERROR', `Error fetching guest report: ${guestError.message}`, { 
        guest_report_id, 
        error_code: guestError.code,
        error_details: guestError.details 
      });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          ready: false, 
          reason: 'Database error occurred while checking report status' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!guestReport) {
      await logError('REPORT_NOT_FOUND', 'Guest report not found in database', { guest_report_id });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          ready: false, 
          reason: 'Report not found' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check conditions for report readiness
    const hasAiReport = guestReport.is_ai_report === true && guestReport.report_log_id !== null;
    const isSwissOnly = guestReport.is_ai_report === false && guestReport.swiss_boolean === true;
    const hasSwissError = guestReport.has_swiss_error === true;
    
    console.log(`📊 Report status - has_ai_report: ${hasAiReport}, is_ai_report: ${guestReport.is_ai_report}, swiss_boolean: ${guestReport.swiss_boolean}, has_swiss_error: ${hasSwissError}, report_log_id: ${guestReport.report_log_id}`);

    // Handle Swiss processing errors
    if (hasSwissError) {
      console.log('❌ Swiss error detected, handling error case');
      
      if (guestReport.user_error_id) {
        // Error already logged, trigger session cleanup
        console.log('🧹 Existing error found, triggering cleanup');
        return new Response(
          JSON.stringify({ 
            ok: false,
            ready: false, 
            reason: 'Report processing error detected - cleanup required',
            error_state: {
              type: 'existing_error',
              requires_cleanup: true,
              user_error_id: guestReport.user_error_id
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // Log new error
        console.log('🚨 New Swiss error, calling error handler');
        try {
          const errorResponse = await supabaseClient.functions.invoke('log-user-error', {
            body: {
              guestReportId: guest_report_id,
              errorType: 'swiss_processing_error',
              errorMessage: 'Swiss data processing failed due to stack depth limit or malformed data',
              email: guestReport.email
            }
          });

          if (errorResponse.error) {
            console.log('❌ Error logging failed:', errorResponse.error);
          } else {
            // Update guest_reports with the error ID
            const { data: errorData } = errorResponse;
            if (errorData?.caseNumber) {
              await supabaseClient
                .from('guest_reports')
                .update({ user_error_id: errorData.errorId })
                .eq('id', guest_report_id);
              
              console.log(`✅ Error logged with case: ${errorData.caseNumber}`);
            }
          }
        } catch (error) {
          console.log('❌ Failed to call log-user-error:', error);
        }

        return new Response(
          JSON.stringify({ 
            ok: false,
            ready: false, 
            reason: 'Swiss data processing error detected and logged',
            error_state: {
              type: 'new_error',
              requires_cleanup: false,
              message: 'Swiss data processing error detected and logged'
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (hasAiReport || isSwissOnly) {
      console.log('✅ Report is ready, preparing data');
      
      // Prepare the complete report data structure
      const reportData = {
        guest_report: guestReport,
        report_content: guestReport.report_logs?.report_text || null,
        swiss_data: guestReport.translator_logs?.swiss_data || null,
        metadata: {
          content_type: hasAiReport ? 'both' : 'astro',
          has_ai_report: hasAiReport,
          has_swiss_data: !!guestReport.translator_logs?.swiss_data,
          is_ready: true
        }
      };

      return new Response(
        JSON.stringify({ ok: true, ready: true, data: reportData }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('⏳ Report not ready yet');
    return new Response(
      JSON.stringify({ ok: true, ready: false, reason: 'Report is still processing' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Log the error to debug_logs if supabaseClient is available
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      await supabaseClient.from('debug_logs').insert({
        source: 'check-report-status',
        message: '[UNHANDLED_ERROR] Unexpected error in check-report-status',
        details: { 
          error_message: error.message,
          error_stack: error.stack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log critical error:', logError);
    }

    console.error('❌ Error in check-report-status:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        ready: false, 
        reason: 'An unexpected error occurred while checking report status' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
