// @ts-nocheck - Deno runtime, types checked at deployment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
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
      .select('report_data, report_type, is_ai_report, email, chat_id')
      .eq('id', guest_report_id)
      .single();

    if (reportError || !reportData) {
      return new Response(JSON.stringify({ error: "Failed to fetch report details for generation" }), { status: 500, headers: corsHeaders });
    }
    
    const smartRequest = reportData.report_type?.split('_')[0] || reportData.report_data?.request || 'essence';

    const translatorPayload = {
      ...reportData.report_data,
      request: smartRequest,
      reportType: reportData.report_type,
      is_guest: true,
      is_ai_report: reportData.is_ai_report,
      user_id: reportData.chat_id,
      request_id: crypto.randomUUID().slice(0, 8),
      email: reportData.email,
      name: reportData.report_data?.name,
    };
    
    // Fire-and-forget
    void supabaseAdmin.functions.invoke('translator-edge', { body: translatorPayload });

    return new Response(JSON.stringify({ success: true, message: "Report generation triggered." }), { status: 202, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
