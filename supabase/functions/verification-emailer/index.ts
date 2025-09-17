import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

serve(async (req) => {
  console.log('[verification-emailer] Function invoked:', { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    console.log('[verification-emailer] Handling CORS preflight request');
    return new Response(null, { headers: cors });
  }

  try {
    console.log('[verification-emailer] Reading request body...');
    const body = await req.text();
    console.log('[verification-emailer] Request body received:', { bodyLength: body.length });
    
    const { to, subject, html, text = "", from } = JSON.parse(body) as EmailPayload;
    console.log('[verification-emailer] Parsed email payload:', { 
      to, 
      subject, 
      htmlLength: html?.length, 
      textLength: text?.length, 
      from 
    });

    if (!to || !subject || !html) {
      console.log('[verification-emailer] Missing required fields:', { to: !!to, subject: !!subject, html: !!html });
      return new Response(
        JSON.stringify({ error: "Missing to / subject / html" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    console.log('[verification-emailer] Checking environment variables...');
    const endpoint = Deno.env.get("OUTBOUND_SMTP_ENDPOINT");
    console.log('[verification-emailer] Environment check:', { 
      hasEndpoint: !!endpoint,
      endpointLength: endpoint?.length || 0
    });
    
    if (!endpoint) {
      console.log('[verification-emailer] Missing SMTP endpoint');
      return new Response(
        JSON.stringify({ error: "SMTP endpoint not set" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Build payload in the same format as outbound-messenger
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const payload = {
      slug: "noreply",
      domain: "therai.co",
      to_email: to,
      subject: subject,
      body: text || html, // Use text version if available, otherwise HTML
      request_id: requestId,
      timestamp: timestamp
    };
    
    console.log('[verification-emailer] Prepared SMTP payload:', { 
      slug: payload.slug,
      domain: payload.domain,
      to_email: payload.to_email, 
      subject: payload.subject,
      bodyLength: payload.body.length,
      request_id: payload.request_id
    });

    console.log('[verification-emailer] Sending request to SMTP endpoint:', endpoint);
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "therai-verification-emailer/1.0"
      },
      body: JSON.stringify(payload),
    });

    console.log('[verification-emailer] SMTP response:', { 
      status: r.status, 
      statusText: r.statusText,
      ok: r.ok 
    });

    if (!r.ok) {
      const err = await r.text();
      console.log('[verification-emailer] SMTP send failed:', { status: r.status, error: err });
      return new Response(
        JSON.stringify({ error: "SMTP send failed", details: err }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const responseText = await r.text();
    console.log('[verification-emailer] SMTP success response:', responseText);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log('[verification-emailer] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
