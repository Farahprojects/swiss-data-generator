
// Outbound message sender via SMTP endpoint
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.177.0";

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
  const { level, data = {}, page = 'outbound-messenger' } = logData;
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
    logMessage("Outbound email request received", { level: 'info', data: { method: req.method } });
    
    // Get authorization header for user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      logMessage("Missing authorization header", { level: 'error' });
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      logMessage("Invalid or expired token", { level: 'error', data: { error: userError?.message } });
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Log raw request data for debugging (sanitizing sensitive data)
    const rawBody = await req.text();
    logMessage("Request body received", { 
      level: 'debug', 
      data: { bodyLength: rawBody.length } 
    });
    
    // Parse the body again since we consumed it
    const { to, subject, html, text, from } = JSON.parse(rawBody) as EmailPayload;
    
    logMessage("Processing outbound email request", { 
      level: 'info',
      data: { 
        to, 
        subject, 
        htmlLength: html?.length || 0,
        textLength: text?.length || 0,
        from: from || "default",
        userId: user.id
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

    const smtpEndpoint = Deno.env.get("OUTBOUND_SMTP_ENDPOINT");
    if (!smtpEndpoint) {
      logMessage("Outbound SMTP endpoint not configured", { 
        level: 'error', 
        data: { envVar: "OUTBOUND_SMTP_ENDPOINT" }
      });
      return new Response(JSON.stringify({ error: "Outbound SMTP endpoint not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logMessage("Sending outbound email via SMTP endpoint", { 
      level: 'info', 
      data: { 
        to,
        endpointDomain: new URL(smtpEndpoint).hostname
      }
    });
    
    // Build the payload in the format expected by the external SMTP service
    const smtpPayload = {
      slug: "madman",
      domain: "therai.coach",
      to_email: to,
      subject: subject,
      body: text || html // Use text version if available, otherwise HTML
    };
    
    logMessage("Sending payload to outbound SMTP endpoint", { 
      level: 'debug', 
      data: { 
        to_email: smtpPayload.to_email, 
        subject: smtpPayload.subject, 
        payloadSize: JSON.stringify(smtpPayload).length,
        slug: smtpPayload.slug,
        domain: smtpPayload.domain
      }
    });
    
    const response = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      logMessage("Outbound SMTP service error", { 
        level: 'error', 
        data: { 
          status: response.status, 
          error,
          to_email: smtpPayload.to_email
        }
      });
      return new Response(JSON.stringify({ error: "Failed to send outbound message", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const responseData = await response.text();
    logMessage("Outbound email sent successfully", { 
      level: 'info',
      data: { 
        to_email: smtpPayload.to_email, 
        responseStatus: response.status
      }
    });

    // Save sent email to database
    try {
      const { error: dbError } = await supabase
        .from('email_messages')
        .insert({
          user_id: user.id,
          subject: subject,
          body: html,
          from_address: from || user.email || 'noreply@therai.coach',
          to_address: to,
          direction: 'outgoing',
          sent_via: 'smtp',
          is_read: true, // Sent emails are considered "read"
          is_starred: false,
          is_archived: false
        });

      if (dbError) {
        logMessage("Failed to save sent email to database", { 
          level: 'error', 
          data: { 
            error: dbError.message,
            to_email: to,
            userId: user.id
          }
        });
        // Don't fail the request if database save fails, email was sent successfully
      } else {
        logMessage("Sent email saved to database successfully", { 
          level: 'info',
          data: { 
            to_email: to,
            userId: user.id
          }
        });
      }
    } catch (saveError) {
      logMessage("Error saving sent email to database", { 
        level: 'error',
        data: { 
          error: saveError instanceof Error ? saveError.message : String(saveError),
          to_email: to,
          userId: user.id
        }
      });
      // Continue with successful response since email was sent
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    logMessage("Unexpected error in outbound-messenger", { 
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
