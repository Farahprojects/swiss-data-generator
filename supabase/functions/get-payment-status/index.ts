
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_id } = await req.json();
    console.log(`[get-payment-status] Received request for guest_id: ${guest_id}`);

    if (!guest_id) {
      console.error("[get-payment-status] Error: guest_id is required");
      return new Response(JSON.stringify({ error: "guest_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabaseAdmin
      .from("guest_reports")
      .select("payment_status, report_data, email")
      .eq("id", guest_id)
      .single();

    if (error) {
      console.error(`[get-payment-status] Supabase query error for guest_id ${guest_id}:`, error);
      return new Response(JSON.stringify({ error: "Guest report not found or query failed", details: error.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`[get-payment-status] Successfully fetched data for guest_id ${guest_id}:`, data);

    const name = data.report_data?.person_a?.name || data.report_data?.name || '';
    console.log(`[get-payment-status] Extracted name: "${name}" and email: "${data.email}"`);

    const responsePayload = { 
      payment_status: data.payment_status,
      name: name,
      email: data.email 
    };

    console.log(`[get-payment-status] Sending response for guest_id ${guest_id}:`, responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('[get-payment-status] Unhandled exception:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
