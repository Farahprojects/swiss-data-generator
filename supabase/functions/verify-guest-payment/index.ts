
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

    // Generate the astrological report using data from report_data column
    let reportContent = null;
    let reportError = null;

    try {
      console.log("🔮 Starting report generation...");
      
      // Extract birth data from the stored report_data
      const storedData = guestReportData.report_data as any;
      console.log("📋 Stored report data:", {
        keys: Object.keys(storedData || {}),
        reportType: guestReportData.report_type
      });

      // Validate required fields
      if (!storedData) {
        throw new Error("No report data found in guest_reports record");
      }

      // Map the report type to translator request type
      let translatorRequest = "natal"; // default
      if (guestReportData.report_type === "essence") {
        // Handle the essence type mapping correctly
        if (storedData.essenceType === "essence_personal") {
          translatorRequest = "essence";
        } else if (storedData.essenceType === "essence_professional") {
          translatorRequest = "essence_professional";
        } else if (storedData.essenceType === "essence_relational") {
          translatorRequest = "essence_relational";
        } else {
          translatorRequest = "essence"; // fallback
        }
      } else if (guestReportData.report_type === "sync") {
        translatorRequest = "synastry";
      } else if (guestReportData.report_type === "natal") {
        translatorRequest = "natal";
      } else {
        // For other report types, use the report type directly
        translatorRequest = guestReportData.report_type;
      }

      // Build translator payload from stored report data
      const translatorPayload: any = {
        request: translatorRequest,
        birth_date: storedData.birthDate,
        birth_time: storedData.birthTime,
        location: storedData.birthLocation,
        skip_logging: true, // Skip translator logging for guest reports
      };

      // Add coordinates if available
      if (storedData.latitude && storedData.longitude) {
        translatorPayload.latitude = parseFloat(storedData.latitude);
        translatorPayload.longitude = parseFloat(storedData.longitude);
      }

      // Add report tier if specified
      if (storedData.reportTier) {
        translatorPayload.report = storedData.reportTier;
      }

      // For relationship reports, add partner data
      if (translatorRequest === "synastry" && storedData.partnerData) {
        translatorPayload.person_a = {
          birth_date: storedData.birthDate,
          birth_time: storedData.birthTime,
          location: storedData.birthLocation,
          latitude: storedData.latitude ? parseFloat(storedData.latitude) : undefined,
          longitude: storedData.longitude ? parseFloat(storedData.longitude) : undefined,
        };
        translatorPayload.person_b = {
          birth_date: storedData.partnerData.birthDate,
          birth_time: storedData.partnerData.birthTime,
          location: storedData.partnerData.birthLocation,
          latitude: storedData.partnerData.latitude ? parseFloat(storedData.partnerData.latitude) : undefined,
          longitude: storedData.partnerData.longitude ? parseFloat(storedData.partnerData.longitude) : undefined,
        };
      }

      // Validate required birth data
      if (!translatorPayload.birth_date) {
        throw new Error("Birth date is required but not found in report data");
      }
      if (!translatorPayload.location && !translatorPayload.latitude) {
        throw new Error("Birth location or coordinates are required but not found in report data");
      }

      console.log("🔮 Translator payload built:", {
        request: translatorPayload.request,
        hasBirthDate: !!translatorPayload.birth_date,
        hasBirthTime: !!translatorPayload.birth_time,
        hasLocation: !!translatorPayload.location,
        hasCoordinates: !!(translatorPayload.latitude && translatorPayload.longitude),
        hasPartnerData: !!translatorPayload.person_b,
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
        reportError = `Translator returned status ${translatorResult.status}: ${translatorResult.text}`;
        console.error("❌ Report generation failed:", reportError);
      }
    } catch (error: any) {
      reportError = `Report generation error: ${error.message}`;
      console.error("❌ Report generation exception:", error);
    }

    // Send email with report if generation was successful
    let emailSent = false;
    let emailError = null;

    if (reportContent && guestReportData.email) {
      try {
        console.log("📧 Sending report email to:", guestReportData.email);
        
        const emailPayload = {
          to: guestReportData.email,
          subject: `Your ${guestReportData.report_type || 'Astrological'} Report`,
          html: `
            <h2>Your Astrological Report</h2>
            <p>Thank you for your purchase! Your report is ready:</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <pre style="white-space: pre-wrap; font-family: Georgia, serif;">${reportContent}</pre>
            </div>
            <p>Order Details:</p>
            <ul>
              <li>Report Type: ${guestReportData.report_type || 'Standard'}</li>
              <li>Amount Paid: $${guestReportData.amount_paid}</li>
              <li>Order ID: ${session.id}</li>
            </ul>
            <p>Thank you for choosing our astrological services!</p>
          `,
          text: `Your Astrological Report\n\n${reportContent}\n\nOrder Details:\nReport Type: ${guestReportData.report_type}\nAmount: $${guestReportData.amount_paid}\nOrder ID: ${session.id}`
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
      const updateData: any = {
        report_content: reportContent,
        email_sent: emailSent,
        updated_at: new Date().toISOString()
      };

      if (reportError) {
        updateData.report_error = reportError;
      }
      if (emailError) {
        updateData.email_error = emailError;
      }

      await supabase
        .from("guest_reports")
        .update(updateData)
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
      reportData: guestReportData.report_data,
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
