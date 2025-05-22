
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const { templateType, recipientEmail, variables = {} } = await req.json() as EmailNotificationRequest;
    
    // Validate required fields
    if (!templateType || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Template type and recipient email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials in environment");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch email template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', templateType)
      .single();

    if (templateError || !template) {
      console.error('Error fetching email template:', templateError || 'Template not found');
      return new Response(
        JSON.stringify({ error: templateError?.message || 'Email template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Call the send-email function to send the email
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject,
          html: htmlContent,
          text: textContent
        })
      }
    );

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Error from email service:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to send email' }),
        { status: emailResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log success for debugging
    console.log(`Email notification sent (${templateType}) to ${recipientEmail}`);
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Log and return any unexpected errors
    console.error('Unexpected error in send-notification-email:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
