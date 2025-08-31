import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendVerificationRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ResendVerificationRequest = await req.json();
    
    console.log('Resend verification request for email:', email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user exists and verification status from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email_verified, verification_status')
      .eq('email', email)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'No account found with this email address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.email_verified || profile.verification_status === 'verified') {
      console.log('User already verified for email:', email);
      return new Response(
        JSON.stringify({ error: 'This email address is already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating new verification link for existing unverified user:', email);

    // Generate email verification link for existing unverified user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'email_change',
      email,
      newEmail: email, // Same email to trigger verification
      options: {
        redirectTo: 'https://therai.co/auth/email'
      }
    });

    if (error) {
      console.error('Error generating verification link:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.properties?.action_link) {
      console.error('No action link in response:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated verification link successfully');

    // Get email template from database
    const { data: templateData, error: templateError } = await supabase
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', 'email_verification')
      .single();

    if (templateError || !templateData) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch email template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace template variables
    const htmlContent = templateData.body_html.replace(/\{\{verification_link\}\}/g, data.properties.action_link);
    const textContent = templateData.body_text.replace(/\{\{verification_link\}\}/g, data.properties.action_link);

    console.log('Sending verification email via verification-emailer');

    // Send verification email using existing verification-emailer function
    const { error: emailError } = await supabase.functions.invoke('verification-emailer', {
      body: {
        to: email,
        subject: templateData.subject,
        html: htmlContent,
        text: textContent
      }
    });

    if (emailError) {
      console.error('Error sending verification email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verification email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email has been resent. Please check your inbox.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in resend-verification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});