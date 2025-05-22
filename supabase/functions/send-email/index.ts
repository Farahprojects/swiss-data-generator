// File: supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { to, subject, html, text, from, replyTo } = await req.json() as EmailRequest;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'To, subject, and html are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const defaultSenderEmail = Deno.env.get("SENDER_EMAIL") || "no-reply@theraiastro.com";
    const senderEmail = from || defaultSenderEmail;

    // Fetch latest Zoho access token from DB
    const { data: tokenRow, error: tokenError } = await supabase
      .from("zoho_tokens")
      .select("access_token")
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenRow?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Unable to retrieve Zoho access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Zoho API
    const response = await fetch('https://mail.zoho.com/api/accounts/emails/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${tokenRow.access_token}`
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
