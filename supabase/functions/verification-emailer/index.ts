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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await req.text();
    const { to, subject, html, text = "", from } = JSON.parse(body) as EmailPayload;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing to / subject / html" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const endpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    const token    = Deno.env.get("THERIA_SMTP_TOKEN");
    if (!endpoint || !token) {
      return new Response(
        JSON.stringify({ error: "SMTP endpoint or token not set" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const payload = { to, subject, html, text, from: from ?? "Therai <no-reply@therai.co>" };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 🔑 send bare token, no Bearer/Token prefix
        "Authorization": token,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(
        JSON.stringify({ error: "SMTP send failed", details: err }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
