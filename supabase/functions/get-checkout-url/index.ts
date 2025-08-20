import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`[get-checkout-url] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[get-checkout-url] Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { guest_id } = body;
    
    if (!guest_id) {
      return new Response(JSON.stringify({ 
        error: "Missing required field: guest_id" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    console.log('[get-checkout-url] Fetching checkout URL for guest:', guest_id);

    const { data: guestReport, error } = await supabase
      .from("guest_reports")
      .select("checkout_url, payment_status")
      .eq("id", guest_id)
      .single();

    if (error || !guestReport) {
      console.warn('[get-checkout-url] Guest report not found:', guest_id);
      return new Response(JSON.stringify({ 
        error: "Guest report not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (guestReport.payment_status === 'paid') {
      console.warn('[get-checkout-url] Payment already completed for guest:', guest_id);
      return new Response(JSON.stringify({ 
        error: "Payment already completed" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!guestReport.checkout_url) {
      console.warn('[get-checkout-url] No checkout URL found for guest:', guest_id);
      return new Response(JSON.stringify({ 
        error: "No checkout URL available" 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[get-checkout-url] ✅ Found checkout URL for guest:', guest_id);

    return new Response(JSON.stringify({
      checkoutUrl: guestReport.checkout_url,
      paymentStatus: guestReport.payment_status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-checkout-url] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
