import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartSignupRequest {
  email: string;
  password: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password }: StartSignupRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
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

    // Generate signup confirmation link using admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/auth/v1/verify?redirect_to=${encodeURIComponent('https://therai.co/auth/email')}`
      }
    });

    if (error) {
      console.error('Error generating signup link:', error);
      
      // Handle email already exists case specifically
      if (error.message?.includes('already been registered') || error.status === 422) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'An account with this email already exists. Please sign in instead.',
            errorCode: 'email_exists'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message || 'Failed to create account',
          errorCode: 'signup_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.properties?.action_link) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to generate verification link',
          errorCode: 'link_generation_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email template from database
    const { data: templateData, error: templateError } = await supabase
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', 'email_verification')
      .single();

    if (templateError || !templateData) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch email template',
          errorCode: 'template_error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace template variables
    const htmlContent = templateData.body_html.replace(/\{\{verification_link\}\}/g, data.properties.action_link);
    const textContent = templateData.body_text.replace(/\{\{verification_link\}\}/g, data.properties.action_link);

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
        JSON.stringify({ 
          success: false,
          error: 'Failed to send verification email',
          errorCode: 'email_send_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent. Please check your inbox and click the verification link to complete registration.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in start-signup function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        errorCode: 'internal_error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});