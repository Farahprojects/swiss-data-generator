import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SITE_URL = Deno.env.get('SITE_URL') || 'https://therai.co';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const ok = (p: unknown) => json(200, p);
const bad = (m: string) => json(400, { error: m });
const oops = (m: string) => json(500, { error: m });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_id, chat_id } = await req.json();
    
    if (!guest_id || !chat_id) {
      return bad('Missing guest_id or chat_id');
    }

    // Get guest report data
    const { data: guestReport, error: reportError } = await supabaseAdmin
      .from('guest_reports')
      .select('amount_paid, report_type, report_data')
      .eq('id', guest_id)
      .single();

    if (reportError || !guestReport) {
      return bad('Guest report not found');
    }

    // Create payment intent
    const { data: paymentIntentData, error: paymentIntentError } = await supabaseAdmin.functions.invoke('create-payment-intent', {
      body: {
        amount: guestReport.amount_paid,
        currency: 'usd',
        guest_id: guest_id,
        chat_id: chat_id,
        description: `Astrology Report: ${guestReport.report_type}`
      }
    });

    if (paymentIntentError || !paymentIntentData?.client_secret) {
      return oops('Failed to create payment intent');
    }

    // Create checkout URL
    const reportParam = encodeURIComponent(guestReport.report_type || 'report');
    const checkoutUrl = `${SITE_URL}/stripe?amount=${guestReport.amount_paid}&guest_id=${guest_id}&chat_id=${chat_id}&report=${reportParam}`;

    // Save checkout URL to guest_reports
    const { error: updateError } = await supabaseAdmin
      .from('guest_reports')
      .update({ checkout_url: checkoutUrl })
      .eq('id', guest_id);

    if (updateError) {
      console.error('Failed to save checkout URL:', updateError);
    }

    return ok({
      checkoutUrl,
      guest_id,
      chat_id
    });

  } catch (error) {
    console.error('Resume stripe checkout error:', error);
    return oops('Internal server error');
  }
});
