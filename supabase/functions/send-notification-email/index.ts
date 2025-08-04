

// deno-lint-ignore-file no-explicit-any email setup 
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotificationRequest {
  templateType: string;
  recipientEmail: string;
  variables?: Record<string, any>;
}

interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  page?: string;
}

// Structured logging function
function logMessage(message: string, logData: Omit<LogData, 'message'>) {
  const { level, data = {}, page = 'send-notification-email' } = logData;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logMessage("Notification request received", { level: 'info', data: { method: req.method } });
    
    // Log the raw request for debugging (with limited length to avoid sensitive data)
    const rawBody = await req.text();
    logMessage("Raw notification request received", { 
      level: 'debug', 
      data: { bodyLength: rawBody.length }
    });
    
    // Parse request body (already consumed text above, so parse it)
    const { templateType, recipientEmail, variables = {} } = JSON.parse(rawBody) as EmailNotificationRequest;
    
    logMessage("Processing notification request", { 
      level: 'info', 
      data: { 
        templateType, 
        recipientEmail, 
        variablesCount: Object.keys(variables).length,
        variables: JSON.stringify(variables).substring(0, 100) // Log the first 100 chars of variables
      }
    });
    
    // Validate required fields
    if (!templateType || !recipientEmail) {
      logMessage("Missing required fields", { 
        level: 'error', 
        data: { hasTemplateType: !!templateType, hasRecipientEmail: !!recipientEmail }
      });
      return new Response(
        JSON.stringify({ error: 'Template type and recipient email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logMessage("Missing Supabase credentials", { level: 'error' });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch email template
    logMessage("Fetching email template", { level: 'info', data: { templateType } });
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', templateType)
      .single();

    if (templateError || !template) {
      logMessage("Error fetching template", { 
        level: 'error', 
        data: { 
          templateType,
          error: templateError?.message || 'Template not found'
        }
      });
      return new Response(
        JSON.stringify({ error: templateError?.message || 'Email template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logMessage("Template found", { 
      level: 'info', 
      data: { 
        templateType, 
        subject: template.subject,
        htmlLength: template.body_html?.length || 0,
        textLength: template.body_text?.length || 0
      }
    });
    
    // Log a snippet of the template content for debugging
    logMessage("Template content sample", {
      level: 'debug',
      data: {
        subject: template.subject,
        htmlSample: template.body_html?.substring(0, 200) + '...',
        textSample: template.body_text?.substring(0, 200) + '...'
      }
    });

    // Process the template with variables
    let htmlContent = template.body_html;
    let textContent = template.body_text || '';
    let subject = template.subject;

    // Replace variables in the templates
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      htmlContent = htmlContent.replace(regex, String(value));
      textContent = textContent.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
    });
    
    logMessage("Template variables replaced", { 
      level: 'info', 
      data: { 
        subject,
        variables: JSON.stringify(variables)
      }
    });

    // Call our verification-emailer function to send the email with a timeout
    logMessage("Calling verification-emailer function", { level: 'info', data: { recipientEmail } });
    
    const emailPromise = fetch(
      `${supabaseUrl}/functions/v1/verification-emailer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject,
          html: htmlContent,
          text: textContent
        })
      }
    );
    
    // Set a 10-second timeout for the email sending
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email sending timed out after 10 seconds")), 10000);
    });
    
    const emailResponse = await Promise.race([emailPromise, timeoutPromise]) as Response;

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      logMessage("Error from email service", {
        level: 'error',
        data: {
          status: emailResponse.status,
          error: errorData.error || 'Unknown error',
          recipientEmail
        }
      });
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to send email' }),
        { status: emailResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logMessage("Email notification sent successfully", { 
      level: 'info', 
      data: { 
        templateType, 
        recipientEmail 
      }
    });
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Log and return any unexpected errors
    logMessage("Unexpected error", { 
      level: 'error',
      data: { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

