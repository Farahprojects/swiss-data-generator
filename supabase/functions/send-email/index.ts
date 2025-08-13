import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  let guestReportId: string | null = null;

  try {
    const raw = await req.text();
    const payload = JSON.parse(raw);
    guestReportId = payload.guest_report_id; // Extract for error logging

    // basic validation
    const { to, subject, html } = payload;
    if (!to || !subject || !html) {
      throw new Error("Missing to / subject / html");
    }

    // secrets
    const endpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    const smtpToken = Deno.env.get("THERIA_SMTP_TOKEN");
    if (!endpoint || !smtpToken) {
      log("error", "Missing SMTP env", { endpointSet: !!endpoint, tokenSet: !!smtpToken });
      throw new Error("SMTP secrets not set");
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
      throw new Error(`SMTP failed: ${err}`);
    }

    log("info", "Email queued OK", { to, subject });
    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred in send-email";
    log("error", "Unhandled exception", { err: errorMessage });

    // Log to user_errors table
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: logError } = await supabase.from('user_errors').insert({
      guest_report_id: guestReportId,
      error_type: 'EMAIL_FAILURE',
      error_message: errorMessage,
      metadata: { function: 'send-email' }
    });

    if (logError) {
      log("error", "Failed to log email error to user_errors", { dbError: logError.message });
    }

    return new Response(JSON.stringify({ error: "Unexpected error", details: errorMessage }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
