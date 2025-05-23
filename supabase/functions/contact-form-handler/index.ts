
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Rate limiting using a simple in-memory store
// In a production environment, consider using Redis or a database for distributed rate limiting
const ipLimiter = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 3; // Updated to 3 emails per hour per IP
const ONE_HOUR_MS = 60 * 60 * 1000;

interface ContactFormPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot?: string; // Honeypot field to catch bots
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function logMessage(message: string, level: 'debug' | 'info' | 'warn' | 'error', data?: any): void {
  const logObject = {
    level,
    message,
    page: 'contact-form-handler',
    data: { ...data, timestamp: new Date().toISOString() }
  };

  // Log in a format that will be easy to parse
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logObject));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logMessage("Contact form handler request received", "info", { method: req.method });
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    
    // Check rate limit
    const now = Date.now();
    const clientData = ipLimiter.get(clientIP);
    
    if (clientData) {
      // Reset counter if the time window has passed
      if (now > clientData.resetTime) {
        ipLimiter.set(clientIP, { count: 1, resetTime: now + ONE_HOUR_MS });
      } 
      // Otherwise increment and check limit
      else {
        clientData.count += 1;
        if (clientData.count > MAX_REQUESTS_PER_HOUR) {
          logMessage("Rate limit exceeded", "warn", { clientIP, count: clientData.count });
          return new Response(JSON.stringify({ 
            error: "Too many requests. Please try again later." 
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    } else {
      // First request from this IP
      ipLimiter.set(clientIP, { count: 1, resetTime: now + ONE_HOUR_MS });
    }
    
    // Parse the form data
    const payload = await req.json() as ContactFormPayload;
    
    // Check for honeypot field (if it's filled, it's likely a bot)
    if (payload.honeypot && payload.honeypot.length > 0) {
      logMessage("Honeypot triggered", "warn", { clientIP });
      // Return success but don't process (to confuse bots)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate required fields
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      logMessage("Missing required fields", "warn", { 
        clientIP,
        hasName: !!payload.name,
        hasEmail: !!payload.email,
        hasSubject: !!payload.subject,
        hasMessage: !!payload.message
      });
      
      return new Response(JSON.stringify({ 
        error: "All fields are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate email format
    if (!validateEmail(payload.email)) {
      logMessage("Invalid email format", "warn", { clientIP, email: payload.email });
      return new Response(JSON.stringify({ 
        error: "Invalid email address" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Prepare data for the send-email function
    const emailPayload = {
      to: "support@theraiastro.com",
      from: "Theria Contact <no-reply@theraiastro.com>",
      subject: `Contact Form: ${payload.subject}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${payload.name} (${payload.email})</p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${payload.message.replace(/\n/g, '<br>')}</p>
      `,
      text: `
        New Contact Message
        
        From: ${payload.name} (${payload.email})
        Subject: ${payload.subject}
        
        Message:
        ${payload.message}
      `
    };
    
    // Get the Supabase anon key for authorization
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";
    
    logMessage("Forwarding to send-email function", "info", { 
      to: emailPayload.to,
      from: emailPayload.from,
      subject: emailPayload.subject
    });
    
    // Get the Supabase URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
    
    // Forward to the send-email function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Important: Include the authorization header with the Bearer token format
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "apikey": supabaseAnonKey
        },
        body: JSON.stringify(emailPayload),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      logMessage("Error from send-email function", "error", { 
        status: response.status,
        errorData
      });
      
      throw new Error(`Email service error: ${response.status}`);
    }
    
    logMessage("Email sent successfully", "info");
    
    // Create Supabase client to fetch the email template
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Fetch the support_email template from database
    logMessage("Fetching support_email template from database", "info");
    
    const { data: template, error: templateError } = await supabase
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', 'support_email')
      .single();
    
    if (templateError || !template) {
      logMessage("Error fetching email template", "error", { 
        error: templateError?.message || "Template not found"
      });
      // Fall back to hardcoded template if database fetch fails
      sendAutoReplyWithHardcodedTemplate(supabaseUrl, supabaseAnonKey, payload);
    } else {
      logMessage("Successfully fetched email template", "info");
      // Send auto-reply with the fetched template
      sendAutoReplyWithTemplate(supabaseUrl, supabaseAnonKey, payload, template);
    }
    
    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    logMessage("Unexpected error", "error", { 
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    
    return new Response(JSON.stringify({ 
      error: "Something went wrong. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Helper function to send auto-reply using template from database
async function sendAutoReplyWithTemplate(
  supabaseUrl: string, 
  supabaseAnonKey: string, 
  payload: ContactFormPayload, 
  template: { subject: string, body_html: string, body_text: string }
) {
  try {
    logMessage("Sending auto-reply email using database template", "info", { 
      recipientEmail: payload.email
    });
    
    // Replace {{name}} placeholder in template with actual name
    let htmlContent = template.body_html.replace(/{{name}}/g, payload.name);
    let textContent = template.body_text.replace(/{{name}}/g, payload.name);
    
    const autoReplyPayload = {
      to: payload.email,
      from: "Theria Astro <no-reply@theraiastro.com>",
      subject: template.subject,
      html: htmlContent,
      text: textContent
    };
    
    await sendEmail(supabaseUrl, supabaseAnonKey, autoReplyPayload);
  } catch (error) {
    logMessage("Error in sendAutoReplyWithTemplate", "error", { 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Fallback function if database fetch fails
async function sendAutoReplyWithHardcodedTemplate(
  supabaseUrl: string, 
  supabaseAnonKey: string, 
  payload: ContactFormPayload
) {
  try {
    logMessage("Using hardcoded template as fallback", "info");
    
    const autoReplyPayload = {
      to: payload.email,
      from: "Theria Astro <no-reply@theraiastro.com>",
      subject: "Your Therai Astro email inquiry has been received",
      html: `<div style="font-family: sans-serif; font-size: 16px; color: #333;"><p>Hi ${payload.name},</p><p>Thanks for reaching out to <strong>Theria Astro</strong>. We've received your message and our team will get back to you within 24 hours.</p><p>Talk soon,<br/>The Theria Astro Team</p></div>`,
      text: `Hi ${payload.name},\n\nThanks for reaching out to Theria Astro. We've received your message and our team will get back to you within 24 hours.\n\nTalk soon,\nThe Theria Astro Team`
    };
    
    await sendEmail(supabaseUrl, supabaseAnonKey, autoReplyPayload);
  } catch (error) {
    logMessage("Error in sendAutoReplyWithHardcodedTemplate", "error", { 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper function to send email
async function sendEmail(supabaseUrl: string, supabaseAnonKey: string, emailPayload: any) {
  const autoReplyResponse = await fetch(
    `${supabaseUrl}/functions/v1/send-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey
      },
      body: JSON.stringify(emailPayload),
    }
  );
  
  if (!autoReplyResponse.ok) {
    const errorData = await autoReplyResponse.text();
    logMessage("Error sending auto-reply email", "error", { 
      status: autoReplyResponse.status,
      errorData,
      recipientEmail: emailPayload.to
    });
  } else {
    logMessage("Auto-reply email sent successfully", "info", {
      recipientEmail: emailPayload.to
    });
  }
}
