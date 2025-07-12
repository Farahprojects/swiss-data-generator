

// SMTP based edge function via api point 
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

interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  page?: string;
}

// Structured logging function
function logMessage(message: string, logData: Omit<LogData, 'message'>) {
  const { level, data = {}, page = 'verification-emailer' } = logData;
  const logObject = {
    level,
    message,
    page,
    data: { ...data, timestamp: new Date().toISOString() }
  };

  // Log in a format that will be easy to parse
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logObject));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logMessage("Email request received", { level: 'info', data: { method: req.method } });
    
    // Log raw request data for debugging (sanitizing sensitive data)
    const rawBody = await req.text();
    logMessage("Request body received", { 
      level: 'debug', 
      data: { bodyLength: rawBody.length } 
    });
    
    // Parse the body and handle optional text field properly
    const parsed = JSON.parse(rawBody);
    const { to, subject, html, from } = parsed;
    const text = parsed.text || "";
    
    logMessage("Processing email request", { 
      level: 'info',
      data: { 
        to, 
        subject, 
        htmlLength: html?.length || 0,
        textLength: text?.length || 0,
        from: from || "default" 
      }
    });

    if (!to || !subject || !html) {
      logMessage("Missing required fields in email request", { 
        level: 'error', 
        data: { hasTo: !!to, hasSubject: !!subject, hasHtml: !!html }
      });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
    if (!smtpEndpoint) {
      logMessage("SMTP endpoint not configured", { 
        level: 'error', 
        data: { envVar: "THERIA_SMTP_ENDPOINT" }
      });
      return new Response(JSON.stringify({ error: "SMTP endpoint not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logMessage("Sending email via SMTP endpoint", { 
      level: 'info', 
      data: { 
        to,
        endpointDomain: new URL(smtpEndpoint).hostname
      }
    });
    
    // Build the exact payload to send to the SMTP endpoint
    const smtpPayload = {
      to,
      subject,
      html,
      text: text || "",
      from: from || "Theria Astro <no-reply@theraiastro.com>"
    };
    
    logMessage("Sending payload to SMTP endpoint", { 
      level: 'debug', 
      data: { 
        to, 
        subject, 
        payloadSize: JSON.stringify(smtpPayload).length 
      }
    });
    
    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      logMessage("SMTP service error", { 
        level: 'error', 
        data: { 
          status: response.status, 
          error,
          to
        }
      });
      return new Response(JSON.stringify({ error: "Failed to send", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const responseData = await response.text();
    logMessage("Email sent successfully", { 
      level: 'info',
      data: { 
        to, 
        responseStatus: response.status
      }
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    logMessage("Unexpected error in verification-emailer", { 
      level: 'error',
      data: { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }
    });
    return new Response(JSON.stringify({ error: "Unexpected error", details: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

