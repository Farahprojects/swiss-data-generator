
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Rate limiting using a simple in-memory store
const ipLimiter = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 3; // 3 emails per hour per IP
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
    
    // Get the Supabase URL and anon key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";
    
    // Create Supabase client to fetch the email template
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Prepare data for the support email
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
    
    // Performance Optimization: Fetch the template in parallel with sending the support email
    const templatePromise = supabase
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', 'support_email')
      .single();
    
    logMessage("Forwarding to send-email function", "info", { 
      to: emailPayload.to,
      from: emailPayload.from,
      subject: emailPayload.subject
    });
    
    // Forward to the send-email function with a timeout of 10 seconds
    const supportEmailPromise = Promise.race([
      fetch(
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
      ),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Support email timeout')), 10000)
      )
    ]);

    // Wait for the support email to be sent
    const response = await supportEmailPromise;
    
    if (!response.ok) {
      const errorData = await response.text();
      logMessage("Error from send-email function", "error", { 
        status: response.status,
        errorData
      });
      
      throw new Error(`Email service error: ${response.status}`);
    }
    
    logMessage("Email sent successfully", "info");
    
    // Create a background task for sending the auto-reply email
    // This allows us to return a response to the user immediately
    const sendAutoReplyAsync = async () => {
      try {
        // Get the template result (which was being fetched in parallel)
        const { data: template, error: templateError } = await templatePromise;
        
        if (templateError || !template) {
          logMessage("Error fetching email template", "error", { 
            error: templateError?.message || "Template not found"
          });
          return;
        } 
        
        logMessage("Successfully fetched email template", "info");
        
        // Send auto-reply with the fetched template
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
        
        const autoReplyResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "apikey": supabaseAnonKey
            },
            body: JSON.stringify(autoReplyPayload),
          }
        );
        
        if (!autoReplyResponse.ok) {
          const errorData = await autoReplyResponse.text();
          logMessage("Error sending auto-reply email", "error", { 
            status: autoReplyResponse.status,
            errorData,
            recipientEmail: autoReplyPayload.to
          });
        } else {
          logMessage("Auto-reply email sent successfully", "info", {
            recipientEmail: autoReplyPayload.to
          });
        }
      } catch (error) {
        logMessage("Error in sending auto-reply", "error", { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };
    
    // Use Deno's waitUntil to handle the background task
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore - EdgeRuntime is available in Deno Deploy
      EdgeRuntime.waitUntil(sendAutoReplyAsync());
    } else {
      // For local development, just execute in the background
      sendAutoReplyAsync().catch(err => {
        logMessage("Background auto-reply task error", "error", { 
          error: err instanceof Error ? err.message : String(err)
        });
      });
    }
    
    // Return success response immediately after the support email is sent
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
