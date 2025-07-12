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
    const rawBody = await req.text();
    const parsed = JSON.parse(rawBody);
    const { to, subject, html, text = "", from } = parsed;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    const smtpToken = Deno.env.get("THERIA_SMTP_TOKEN");

    if (!smtpEndpoint || !smtpToken) {
      return new Response(JSON.stringify({ error: "SMTP endpoint or token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const smtpPayload = {
      to,
      subject,
      html,
      text,
      from: from || "Theria Astro <no-reply@theraiastro.com>"
    };

    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${smtpToken}`
      },
      body: JSON.stringify(smtpPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: "SMTP send failed", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
