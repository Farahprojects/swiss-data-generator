import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface DiagnosticRequest {
  guest_report_id: string;
  case_number?: string;
}

interface DiagnosticResponse {
  status: 'success' | 'error' | 'report_found' | 'processing' | 'failed';
  message: string;
  report_ready?: boolean;
  report_logs_status?: string;
  should_show_error?: boolean;
  case_number?: string;
}

serve(async (req) => {
  console.log(`[error-handler-diagnostic] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body: DiagnosticRequest = await req.json();
    console.log('[error-handler-diagnostic] Request body:', body);
    console.log(`🔧 [error-handler-diagnostic] Processing diagnostic for guest_report_id: ${body.guest_report_id}`);
    
    const { guest_report_id, case_number } = body;

    if (!guest_report_id) {
      return new Response(JSON.stringify({
        error: "Missing required field: guest_report_id"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    console.log('[error-handler-diagnostic] Starting diagnostic for:', guest_report_id);

    // Step 1: Check if report exists in report_ready_signals
    console.log(`[error-handler-diagnostic] Checking report_ready_signals for guest_report_id: ${guest_report_id}`);
    const { data: reportReadyData, error: reportReadyError } = await supabase
      .from('report_ready_signals')
      .select('guest_report_id, seen')
      .eq('guest_report_id', guest_report_id)
      .limit(1);

    if (reportReadyError) {
      console.error('[error-handler-diagnostic] Error checking report_ready_signals:', reportReadyError);
    }

    // If report is ready, return success
    if (reportReadyData && reportReadyData.length > 0) {
      console.log('[error-handler-diagnostic] Report found in report_ready_signals');
      
      const response: DiagnosticResponse = {
        status: 'report_found',
        message: 'We found your report! Loading it now...',
        report_ready: true
      };

      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Step 2: Check report_logs for status
    console.log('[error-handler-diagnostic] Checking report_logs...');
    const { data: reportLogsData, error: reportLogsError } = await supabase
      .from('report_logs')
      .select('status, error_message, created_at')
      .eq('client_id', guest_report_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reportLogsError) {
      console.error('[error-handler-diagnostic] Error checking report_logs:', reportLogsError);
    }

    if (reportLogsData && reportLogsData.length > 0) {
      const latestLog = reportLogsData[0];
      console.log('[error-handler-diagnostic] Latest report_log status:', latestLog.status);

      if (latestLog.status === 'success') {
        // Report was successful, trigger report loading
        console.log('[error-handler-diagnostic] Report was successful, triggering load');
        
        const response: DiagnosticResponse = {
          status: 'success',
          message: 'Your report was successfully generated! Loading it now...',
          report_logs_status: 'success'
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      } else if (latestLog.status === 'error' || latestLog.status === 'failed') {
        // Report failed, show error handler
        console.log('[error-handler-diagnostic] Report failed, showing error handler');
        
        const response: DiagnosticResponse = {
          status: 'failed',
          message: latestLog.error_message || 'Report generation failed',
          report_logs_status: latestLog.status,
          should_show_error: true,
          case_number: case_number
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      } else {
        // Still processing
        console.log('[error-handler-diagnostic] Report still processing');
        
        const response: DiagnosticResponse = {
          status: 'processing',
          message: 'Your report is still being processed...',
          report_logs_status: latestLog.status
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }

    // Step 3: No data found in either table
    console.log('[error-handler-diagnostic] No data found in either table');
    
    const response: DiagnosticResponse = {
      status: 'error',
      message: 'Unable to find report information. Please try again later.',
      should_show_error: true,
      case_number: case_number
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error('[error-handler-diagnostic] Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
