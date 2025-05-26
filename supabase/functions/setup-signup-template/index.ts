
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Insert signup verification template
    const { error } = await supabaseAdmin
      .from('email_notification_templates')
      .upsert({
        template_type: 'signup_verification',
        subject: 'Verify Your Email Address',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #333;">Welcome to Theria API!</h1>
            </div>
            <div style="color: #555; line-height: 1.6;">
              <p>Hello,</p>
              <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verificationLink}}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #7C3AED;">{{verificationLink}}</p>
              <p>This link will expire in 24 hours for security reasons.</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; text-align: center;">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>© 2024 Theria API. All rights reserved.</p>
            </div>
          </div>
        `,
        body_text: `
Welcome to Theria API!

Thank you for signing up! Please verify your email address by visiting this link:

{{verificationLink}}

This link will expire in 24 hours for security reasons.

If you did not create this account, please ignore this email.

© 2024 Theria API. All rights reserved.
        `
      });

    if (error) {
      console.error('Error inserting template:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Signup verification template created' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
