import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Attachment {
  filename:  string;
  content:   string;            // base-64
  mimetype?: string;
  encoding?: string;
}

interface EmailPayload {
  to:          string;
  subject:     string;
  html:        string;
  text?:       string;
  from?:       string;
  attachments?: Attachment[];
}

function log(level: "debug"|"info"|"warn"|"error", msg: string, data: Record<string,unknown> = {}) {
  console[level === "error" ? "error" : "log"](
    JSON.stringify({ level, message: msg, page: "send-email", data: { ...data, ts: new Date().toISOString() } }),
  );
}

serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const raw = await req.text();
    const payload = JSON.parse(raw) as EmailPayload;

    // basic validation
    const { to, subject, html } = payload;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to / subject / html" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // secrets
    const endpoint = Deno.env.get("OUTBOUND_SMTP_ENDPOINT");
    const smtpToken = Deno.env.get("THERIA_SMTP_TOKEN");
    if (!endpoint || !smtpToken) {
      log("error", "Missing SMTP env", { endpointSet: !!endpoint, tokenSet: !!smtpToken });
      return new Response(JSON.stringify({ error: "SMTP secrets not set" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // attachment defaults
    const normalised = (payload.attachments ?? []).map((a) => ({
      encoding: "base64",
      mimetype: "application/octet-stream",
      ...a,
    }));

    const out = { ...payload, attachments: normalised.length ? normalised : undefined };

    // forward
    const r = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": smtpToken,          // ← bare token
      },
      body: JSON.stringify(out),
    });

    if (!r.ok) {
      const err = await r.text();
      log("error", "SMTP service error", { status: r.status, err });
      return new Response(JSON.stringify({ error: "SMTP failed", details: err }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    log("info", "Email queued OK", { to, subject });
    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    log("error", "Unhandled exception", { err: String(e) });
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
