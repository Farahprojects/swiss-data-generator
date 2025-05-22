
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

    // Get sender email from environment or use fallback
    const defaultSenderEmail = Deno.env.get("SENDER_EMAIL") || "no-reply@theraiastro.com";
    
    // Get zoho credentials
    const zohoPassword = Deno.env.get("ZOHO_SMTP_PASSWORD") || "";
    if (!zohoPassword) {
      console.error("Missing Zoho SMTP password in environment");
      return new Response(
        JSON.stringify({ error: 'Missing email configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const senderEmail = from || defaultSenderEmail;
    
    // Use Zoho's API endpoint directly instead of SMTP
    const response = await fetch('https://mail.zoho.com/api/accounts/emails/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${zohoPassword}`
      },
      body: JSON.stringify({
        fromAddress: senderEmail,
        toAddress: to,
        subject: subject,
        content: html,
        mailFormat: 'html'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error from Zoho API:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email through Zoho API', 
          details: errorData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
