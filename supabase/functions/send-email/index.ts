
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 Email request received");
    
    // Log raw request data for debugging
    const rawBody = await req.text();
    console.log(`Raw request body: ${rawBody.substring(0, 200)}${rawBody.length > 200 ? '...' : ''}`);
    
    // Parse the body again since we consumed it
    const { to, subject, html, text, from } = JSON.parse(rawBody) as EmailPayload;
    
    console.log("📧 Email payload:", { 
      to, 
      subject, 
      htmlLength: html?.length || 0,
      textLength: text?.length || 0,
      from: from || "default" 
    });

    if (!to || !subject || !html) {
      console.error("Missing required fields in email request:", { to, subject, hasHtml: !!html });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    if (!smtpEndpoint) {
      console.error("SMTP endpoint not configured - THERIA_SMTP_ENDPOINT is missing");
      return new Response(JSON.stringify({ error: "SMTP endpoint not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Attempting to send email to ${to} via SMTP endpoint ${smtpEndpoint.substring(0, 20)}...`);
    
    // Build the exact payload to send to the SMTP endpoint
    const smtpPayload = {
      to,
      subject,
      html,
      text: text || "",
      from: from || "Theria Astro <no-reply@theraiastro.com>"
    };
    
    console.log("Sending payload to SMTP endpoint:", JSON.stringify(smtpPayload).substring(0, 200));
    
    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("SMTP service error:", error);
      console.error("SMTP response status:", response.status);
      return new Response(JSON.stringify({ error: "Failed to send", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const responseData = await response.text();
    console.log(`Email sent successfully to ${to} with SMTP response:`, responseData);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Unexpected error in send-email:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
