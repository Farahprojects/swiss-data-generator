
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";
import { translate } from "../_shared/translator.ts";

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
    const { sessionId } = await req.json();

    console.log("🔍 Starting payment verification for session:", sessionId);

    if (!sessionId) {
      console.error("❌ No session ID provided");
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-04-10",
    });

    // Initialize Supabase with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    console.log("🔐 Initialized Stripe and Supabase clients");

    // Check if we already have a record for this session
    const { data: existingRecord, error: checkError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows found
      console.error("❌ Error checking existing record:", checkError);
    } else if (existingRecord) {
      console.log("✅ Found existing guest report record:", existingRecord.id);
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          paymentStatus: existingRecord.payment_status,
          reportData: existingRecord.report_data,
          guestReportId: existingRecord.id,
          message: "Payment already verified and recorded"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve the checkout session from Stripe
    console.log("🔎 Fetching session from Stripe...");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("📋 Session retrieved from Stripe:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      customer: session.customer,
      metadata_keys: session.metadata ? Object.keys(session.metadata) : []
    });

    // Verify that payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ Payment not completed. Status:", session.payment_status);
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    console.log("✅ Payment verified as paid");

    // Extract metadata for report generation
    const reportData = {
      email: session.metadata?.guest_email || session.customer_details?.email,
      amount: session.metadata?.amount,
      description: session.metadata?.description,
      reportType: session.metadata?.reportType,
      sessionId: session.id,
      // Add any other metadata we stored during checkout
      ...session.metadata,
    };

    console.log("📊 Extracted report data:", {
      email: reportData.email,
      reportType: reportData.reportType,
      amount: reportData.amount,
      metadataFields: Object.keys(reportData).length
    });

    // Insert into guest_reports table to track this payment and report generation
    console.log("💾 Inserting guest report record...");
    const { data: guestReportData, error: insertError } = await supabase
      .from("guest_reports")
      .insert({
        stripe_session_id: session.id,
        email: reportData.email,
        report_type: reportData.reportType || "unknown",
        amount_paid: (session.amount_total || 0) / 100, // Convert cents to dollars
        report_data: reportData,
        payment_status: "paid",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting guest report record:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw new Error(`Failed to create guest report record: ${insertError.message}`);
    }

    console.log("✅ Guest report record created successfully:", {
      id: guestReportData.id,
      email: guestReportData.email,
      reportType: guestReportData.report_type,
      amountPaid: guestReportData.amount_paid
    });

    // Generate the astrological report
    let reportContent = null;
    let reportError = null;

    try {
      console.log("🔮 Starting report generation...");
      
      // Build translator payload from Stripe metadata
      const translatorPayload = {
        request: session.metadata?.request || "natal", // Default to natal chart
        birth_date: session.metadata?.birth_date,
        birth_time: session.metadata?.birth_time,
        location: session.metadata?.location,
        latitude: session.metadata?.latitude ? parseFloat(session.metadata.latitude) : undefined,
        longitude: session.metadata?.longitude ? parseFloat(session.metadata.longitude) : undefined,
        report: session.metadata?.report || "standard", // Report tier
        skip_logging: true, // Skip translator logging for guest reports
      };

      console.log("🔮 Translator payload:", {
        request: translatorPayload.request,
        hasLocation: !!translatorPayload.location,
        hasCoordinates: !!(translatorPayload.latitude && translatorPayload.longitude),
        reportTier: translatorPayload.report
      });

      // Call translator directly
      const translatorResult = await translate(translatorPayload);
      
      console.log("🔮 Translator response:", {
        status: translatorResult.status,
        hasText: !!translatorResult.text,
        textLength: translatorResult.text?.length || 0
      });

      if (translatorResult.status === 200) {
        reportContent = translatorResult.text;
        console.log("✅ Report generated successfully");
      } else {
        reportError = `Translator returned status ${translatorResult.status}`;
        console.error("❌ Report generation failed:", reportError);
      }
    } catch (error: any) {
      reportError = `Report generation error: ${error.message}`;
      console.error("❌ Report generation exception:", error);
    }

    // Send email with report if generation was successful
    let emailSent = false;
    let emailError = null;

    if (reportContent && reportData.email) {
      try {
        console.log("📧 Sending report email to:", reportData.email);
        
        const emailPayload = {
          to: reportData.email,
          subject: `Your ${reportData.reportType || 'Astrological'} Report`,
          html: `
            <h2>Your Astrological Report</h2>
            <p>Thank you for your purchase! Your report is ready:</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <pre style="white-space: pre-wrap; font-family: Georgia, serif;">${reportContent}</pre>
            </div>
            <p>Order Details:</p>
            <ul>
              <li>Report Type: ${reportData.reportType || 'Standard'}</li>
              <li>Amount Paid: $${reportData.amount}</li>
              <li>Order ID: ${session.id}</li>
            </ul>
            <p>Thank you for choosing our astrological services!</p>
          `,
          text: `Your Astrological Report\n\n${reportContent}\n\nOrder Details:\nReport Type: ${reportData.reportType}\nAmount: $${reportData.amount}\nOrder ID: ${session.id}`
        };

        const emailResponse = await supabase.functions.invoke("send-email", {
          body: emailPayload
        });

        if (emailResponse.error) {
          emailError = `Email sending failed: ${emailResponse.error.message}`;
          console.error("❌ Email sending failed:", emailResponse.error);
        } else {
          emailSent = true;
          console.log("✅ Report email sent successfully");
        }
      } catch (error: any) {
        emailError = `Email error: ${error.message}`;
        console.error("❌ Email sending exception:", error);
      }
    }

    // Update guest_reports record with report content and email status
    try {
      await supabase
        .from("guest_reports")
        .update({
          report_content: reportContent,
          report_error: reportError,
          email_sent: emailSent,
          email_error: emailError,
          updated_at: new Date().toISOString()
        })
        .eq("id", guestReportData.id);
      
      console.log("✅ Updated guest report record with report and email status");
    } catch (error: any) {
      console.error("❌ Failed to update guest report record:", error);
    }

    // Return verified payment details along with guest report ID
    const response = {
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total,
      currency: session.currency,
      reportData,
      guestReportId: guestReportData.id,
      reportGenerated: !!reportContent,
      emailSent,
      reportError,
      emailError
    };

    console.log("🎉 Payment verification and report processing completed successfully");

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Payment verification failed:", {
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
