
// deno-lint-ignore-file no-explicit-any email setup 
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
    console.log("🔔 Notification request received");
    
    // Log the raw request for debugging
    const rawBody = await req.text();
    console.log(`Raw notification request body: ${rawBody.substring(0, 200)}${rawBody.length > 200 ? '...' : ''}`);
    
    // Extract authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header in notification request');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (already consumed text above, so parse it)
    const { templateType, recipientEmail, variables = {} } = JSON.parse(rawBody) as EmailNotificationRequest;
    
    console.log(`Processing notification request of type "${templateType}" for ${recipientEmail}`);
    console.log("Variables provided:", JSON.stringify(variables));
    
    // Validate required fields
    if (!templateType || !recipientEmail) {
      console.error('Missing required fields in notification request:', { templateType, recipientEmail });
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
    console.log(`Fetching email template for "${templateType}"`);
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

    console.log(`Template found for "${templateType}":`);
    console.log(`Subject: ${template.subject}`);
    console.log(`HTML Length: ${template.body_html?.length || 0}`);
    console.log(`Text Length: ${template.body_text?.length || 0}`);

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
    
    console.log("Variables replaced in template");
    console.log(`Final Subject: ${subject}`);

    // Call our new send-email function to send the email
    console.log(`Calling send-email function for ${recipientEmail}`);
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

    const responseData = await emailResponse.json();
    console.log(`Email notification sent (${templateType}) to ${recipientEmail}:`, responseData);
    
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
