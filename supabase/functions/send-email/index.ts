
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
    const { to, subject, html, text, from } = await req.json() as EmailPayload;

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
    
    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        html,
        text: text || "",
        from: from || "Theria Astro <no-reply@theraiastro.com>"
      })
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

    console.log(`Email sent successfully to ${to}`);
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
