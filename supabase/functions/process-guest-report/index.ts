
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guestReportId } = await req.json();

    console.log("🔄 Processing guest report:", guestReportId);

    if (!guestReportId) {
      throw new Error("Guest report ID is required");
    }

    // Initialize Supabase with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    console.log("📋 Fetching guest report details...");

    // Fetch the guest report data
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guestReportId)
      .eq("payment_status", "paid")
      .single();

    if (fetchError || !guestReport) {
      console.error("❌ Error fetching guest report:", fetchError);
      throw new Error("Guest report not found or payment not verified");
    }

    console.log("✅ Guest report found:", {
      id: guestReport.id,
      email: guestReport.email,
      reportType: guestReport.report_type,
      hasReport: guestReport.has_report
    });

    // Check if report has already been generated
    if (guestReport.has_report || guestReport.report_content) {
      console.log("ℹ️ Report already generated for this guest report");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Report already generated",
          guestReportId: guestReport.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract report data from the guest report
    const reportData = guestReport.report_data || {};
    
    console.log("🔧 Preparing payload for translator...");

    // Prepare the payload for the Swiss translator
    const translatorPayload = {
      email: guestReport.email,
      report: guestReport.report_type,
      // Include all the report data that was stored during checkout
      ...reportData,
      // Mark this as a guest report for tracking
      guest_report_id: guestReport.id,
      guest_checkout: true
    };

    console.log("📡 Calling Swiss translator with payload:", {
      email: translatorPayload.email,
      report: translatorPayload.report,
      guestReportId: translatorPayload.guest_report_id,
      dataFields: Object.keys(reportData).length
    });

    // Call the Swiss translator function
    const { data: translatorResponse, error: translatorError } = await supabase.functions.invoke("swiss", {
      body: translatorPayload,
    });

    if (translatorError) {
      console.error("❌ Error calling Swiss translator:", translatorError);
      
      // Update guest report with error status
      await supabase
        .from("guest_reports")
        .update({
          report_content: `Error generating report: ${translatorError.message}`,
          has_report: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", guestReport.id);

      throw new Error(`Failed to generate report: ${translatorError.message}`);
    }

    console.log("🎉 Report generated successfully");

    // Update the guest report with the generated content
    const { error: updateError } = await supabase
      .from("guest_reports")
      .update({
        report_content: typeof translatorResponse === 'string' ? translatorResponse : JSON.stringify(translatorResponse),
        has_report: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", guestReport.id);

    if (updateError) {
      console.error("❌ Error updating guest report:", updateError);
      throw new Error(`Failed to save report: ${updateError.message}`);
    }

    console.log("✅ Guest report processing completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Report generated and saved successfully",
        guestReportId: guestReport.id,
        reportGenerated: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Guest report processing failed:", {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
