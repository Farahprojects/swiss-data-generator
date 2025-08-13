import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SITE_URL = Deno.env.get('SITE_URL') || 'https://theraiastro.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_report_id } = await req.json();
    if (!guest_report_id) {
      return new Response(JSON.stringify({ error: "guest_report_id is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('guest_reports')
      .select('amount_paid, email, report_type')
      .eq('id', guest_report_id)
      .single();

    if (reportError || !reportData) {
      return new Response(JSON.stringify({ error: "Failed to fetch report details" }), { status: 500, headers: corsHeaders });
    }

    const checkoutPayload = {
      guest_report_id: guest_report_id,
      amount: reportData.amount_paid,
      email: reportData.email,
      description: `Astrology Report: ${reportData.report_type}`,
      successUrl: `${SITE_URL}/report?guest_id=${guest_report_id}&payment_status=success`,
      cancelUrl: `${SITE_URL}/report?guest_id=${guest_report_id}&payment_status=cancelled`,
    };
    
    const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('create-checkout', {
      body: checkoutPayload,
    });

    if (checkoutError || !checkoutData?.url) {
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ checkoutUrl: checkoutData.url }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
