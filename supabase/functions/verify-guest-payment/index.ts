
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { guest_report_id } = await req.json();

    if (!guest_report_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing guest_report_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[verify-guest-payment] Verifying payment for guest report:', guest_report_id);

    // Get the guest report
    const { data: guestReport, error: guestError } = await supabase
      .from('guest_reports')
      .select('*')
      .eq('id', guest_report_id)
      .single();

    if (guestError || !guestReport) {
      console.error('[verify-guest-payment] Guest report not found:', guestError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Guest report not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if payment is completed - FIXED: Changed from 'completed' to 'paid'
    if (guestReport.payment_status !== 'paid') {
      console.log('[verify-guest-payment] Payment not completed:', guestReport.payment_status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment not completed' 
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[verify-guest-payment] Payment verified, generating report...');

    // Prepare the payload for translation
    const translationPayload = {
      ...guestReport.report_data,
      user_id: guest_report_id,
      stripe_session_id: guestReport.stripe_session_id,
      is_guest: true,
    };

    // Call the new translate-request edge function
    const { data: translateResult, error: translateError } = await supabase.functions.invoke(
      'translate-request',
      {
        body: translationPayload
      }
    );

    if (translateError) {
      console.error('[verify-guest-payment] Translation error:', translateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Translation failed: ${translateError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[verify-guest-payment] Translation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report generated successfully',
        data: translateResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[verify-guest-payment] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
