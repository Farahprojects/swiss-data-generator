import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SITE_URL = Deno.env.get('SITE_URL') || 'https://theraiastro.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_id } = await req.json();

    if (!guest_id) {
      return new Response(JSON.stringify({ error: "guest_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: report, error: fetchError } = await supabaseAdmin
      .from("guest_reports")
      .select("amount_paid, email, report_type")
      .eq("id", guest_id)
      .single();

    if (fetchError || !report) {
      throw new Error(fetchError?.message || "Report not found");
    }

    const checkoutPayload = {
      guest_report_id: guest_id,
      amount: report.amount_paid,
      email: report.email,
      description: `Astrology Report: ${report.report_type}`,
      successUrl: `${SITE_URL}/report?guest_id=${guest_id}&payment_status=success`,
      cancelUrl: `${SITE_URL}/report?guest_id=${guest_id}&payment_status=cancelled`,
    };

    const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('create-checkout', {
      body: checkoutPayload,
    });

    if (checkoutError || !checkoutData?.url) {
      throw new Error(checkoutError?.message || "Failed to create checkout session");
    }

    return new Response(JSON.stringify({ checkoutUrl: checkoutData.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
