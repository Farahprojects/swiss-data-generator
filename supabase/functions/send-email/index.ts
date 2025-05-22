
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { to, subject, html, text, from, replyTo } = await req.json() as EmailRequest;
    
    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'To, subject, and html are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SMTP client
    const client = new SmtpClient();
    
    // Get sender email from environment or use fallback
    const defaultSenderEmail = Deno.env.get("SENDER_EMAIL") || "no-reply@theraiastro.com";
    
    // Connect to Zoho SMTP
    await client.connectTLS({
      hostname: "smtp.zoho.com",
      port: 465,
      username: defaultSenderEmail, // Use sender email as SMTP username
      password: Deno.env.get("ZOHO_SMTP_PASSWORD") || "",
    });

    // Send email
    const senderEmail = from || defaultSenderEmail;
    
    await client.send({
      from: senderEmail,
      to: to,
      subject: subject,
      content: text || "",
      html: html,
      replyTo: replyTo || senderEmail
    });

    // Close connection
    await client.close();
    
    console.log(`Email sent successfully to ${to}`);
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in send-email function:', err);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
