// Outbound message sender via SMTP endpoint
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

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
    // Generate unique request ID for correlation with VPS logs
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    logMessage("Outbound email request received", { level: 'info', data: { method: req.method, requestId, timestamp } });
    
    // Initialize Supabase client (no auth required for testing)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    // Save outbound email to email_messages table
    const { error: dbError } = await supabase
      .from('email_messages')
      .insert({
        subject: subject,
        body: html || text || '',
        from_address: from || 'test@example.com',
        to_address: to,
        direction: 'outbound',
        sent_via: 'outbound-messenger',
        is_read: true,
        is_starred: false,
        is_archived: false
      });

    if (dbError) {
      logMessage("Failed to save outbound email to database", { 
        level: 'error',
        data: { 
          requestId,
          error: dbError.message,
          to,
          subject
        }
      });
      return new Response(JSON.stringify({ error: "Failed to save email to database", details: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logMessage("Outbound email saved to database successfully", { 
      level: 'info',
      data: { 
        requestId,
        to,
        subject,
        direction: 'outbound'
      }
    });
    
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
