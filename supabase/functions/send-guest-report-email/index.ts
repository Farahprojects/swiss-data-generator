
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

    console.log("📧 Sending guest report email for:", guestReportId);

    if (!guestReportId) {
      throw new Error("Guest report ID is required");
    }

    // Initialize Supabase with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    // Fetch the guest report data
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guestReportId)
      .eq("has_report", true)
      .single();

    if (fetchError || !guestReport) {
      console.error("❌ Error fetching guest report:", fetchError);
      throw new Error("Guest report not found or report not ready");
    }

    console.log("✅ Guest report found:", {
      id: guestReport.id,
      email: guestReport.email,
      reportType: guestReport.report_type,
      emailSent: guestReport.email_sent
    });

    // Check if email has already been sent
    if (guestReport.email_sent) {
      console.log("ℹ️ Email already sent for this guest report");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email already sent",
          guestReportId: guestReport.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare email content
    const emailSubject = `Your ${guestReport.report_type} Report is Ready!`;
    const emailBody = `
Dear Customer,

Your ${guestReport.report_type} report has been successfully generated and is ready for you!

Report Details:
- Type: ${guestReport.report_type}
- Generated: ${new Date(guestReport.updated_at).toLocaleString()}
- Amount Paid: $${guestReport.amount_paid}

Your personalized report is attached below:

${guestReport.report_content}

Thank you for your purchase!

Best regards,
The TheraAI Team
    `;

    console.log("📨 Sending email to:", guestReport.email);

    // Call the existing send-email function
    const { data: emailResponse, error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: guestReport.email,
        subject: emailSubject,
        html: emailBody.replace(/\n/g, '<br>'),
        text: emailBody
      },
    });

    if (emailError) {
      console.error("❌ Error sending email:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("✅ Email sent successfully");

    // Mark email as sent in the database
    const { error: updateError } = await supabase
      .from("guest_reports")
      .update({
        email_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", guestReport.id);

    if (updateError) {
      console.error("❌ Error updating email sent status:", updateError);
      // Don't throw error here as email was sent successfully
    }

    console.log("🎉 Guest report email process completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        guestReportId: guestReport.id,
        emailSent: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Guest report email sending failed:", {
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
