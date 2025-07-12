// SMTP based edge function via api point
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

//
// ─── TYPES ──────────────────────────────────────────────────────────────────────
//

interface Attachment {
  filename: string;
  content: string;           // base-64
  mimetype?: string;         // default handled below
  encoding?: string;         // defaults to 'base64'
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Attachment[]; // ← NEW
}

interface LogData {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
  page?: string;
}

//
// ─── LOGGING ────────────────────────────────────────────────────────────────────
//

function logMessage(message: string, logData: Omit<LogData, "message">) {
  const { level, data = {}, page = "send-email" } = logData;
  const logObject = {
    level,
    message,
    page,
    data: { ...data, timestamp: new Date().toISOString() },
  };
  console[level === "error" ? "error" : "log"](JSON.stringify(logObject));
}

//
// ─── MAIN HANDLER ───────────────────────────────────────────────────────────────
//

serve(async (req) => {
  // ── CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logMessage("Email request received", {
      level: "info",
      data: { method: req.method },
    });

    // Raw body (for debugging body length)
    const rawBody = await req.text();
    logMessage("Request body received", {
      level: "debug",
      data: { bodyLength: rawBody.length },
    });

    // Parse & validate
    const {
      to,
      subject,
      html,
      text = "",
      from = "Theria Astro <no-reply@theraiastro.com>",
      attachments = [],
    } = JSON.parse(rawBody) as EmailPayload;

    logMessage("Processing email request", {
      level: "info",
      data: {
        to,
        subject,
        htmlLength: html?.length ?? 0,
        textLength: text?.length ?? 0,
        from,
        attachmentsCount: attachments.length,
      },
    });

    if (!to || !subject || !html) {
      logMessage("Missing required fields in email request", {
        level: "error",
        data: { hasTo: !!to, hasSubject: !!subject, hasHtml: !!html },
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    if (!smtpEndpoint) {
      logMessage("SMTP endpoint not configured", {
        level: "error",
        data: { envVar: "THERIA_SMTP_ENDPOINT" },
      });
      return new Response(
        JSON.stringify({ error: "SMTP endpoint not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    //
    // ─── BUILD PAYLOAD FOR SMTP SERVICE ────────────────────────────────────────
    //

    // Ensure every attachment has mimetype + encoding defaults
    const normalizedAttachments = attachments.map((a) => ({
      encoding: "base64",
      mimetype: "application/octet-stream",
      ...a,
    }));

    const smtpPayload = {
      to,
      subject,
      html,
      text,
      from,
      attachments: normalizedAttachments.length ? normalizedAttachments : undefined,
    };

    logMessage("Sending payload to SMTP endpoint", {
      level: "debug",
      data: {
        to,
        subject,
        payloadSize: JSON.stringify(smtpPayload).length,
        attachmentsCount: normalizedAttachments.length,
      },
    });

    //
    // ─── FORWARD TO SMTP ENDPOINT ──────────────────────────────────────────────
    //

    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      logMessage("SMTP service error", {
        level: "error",
        data: { status: response.status, error, to },
      });
      return new Response(
        JSON.stringify({ error: "Failed to send", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logMessage("Email sent successfully", {
      level: "info",
      data: { to, responseStatus: response.status },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logMessage("Unexpected error in send-email", {
      level: "error",
      data: {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
