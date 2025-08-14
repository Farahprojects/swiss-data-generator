import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { guest_report_id } = await req.json();
    if (!guest_report_id) {
      return new Response(JSON.stringify({ error: "guest_report_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("guest_reports")
      .select("report_pdf_data, report_type, id")
      .eq("id", guest_report_id)
      .single();

    if (error || !data || !data.report_pdf_data) {
      const errorMessage = error?.message || "PDF data not found for this report.";
      console.error(`[download-report-pdf] Error fetching PDF for ${guest_report_id}: ${errorMessage}`);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const filename = `Therai-Report-${data.report_type}-${data.id.substring(0, 8)}.pdf`;

    return new Response(data.report_pdf_data, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      status: 200,
    });

  } catch (err) {
    console.error("[download-report-pdf] Unhandled exception:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 