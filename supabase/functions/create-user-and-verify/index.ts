import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { method } = req;
    const requestBody = await req.json();
    const { email, password } = requestBody;

    if (method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    if (!email || !password) {
      return new Response('Email and password are required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`[create-user-and-verify] Starting signup process for email: ${email}`);

    // Step 1: Create user using admin API with email_confirm: false to get the confirmation token
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false // Don't auto-confirm, get the token instead
    });

    if (signUpError) {
      console.error(`[create-user-and-verify] SignUp error:`, signUpError);
      
      // Handle specific error cases
      if (signUpError.message?.includes('already been registered') || 
          signUpError.message?.includes('already registered') ||
          signUpError.status === 422 || 
          signUpError.code === 'email_exists') {
        return new Response(JSON.stringify({ 
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'EMAIL_EXISTS'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict status for already exists
        });
      }
      
      return new Response(JSON.stringify({ 
        error: signUpError.message || 'Failed to create account',
        code: 'USER_CREATION_FAILED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!signUpData.user) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create user account',
        code: 'USER_CREATION_FAILED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[create-user-and-verify] User created successfully: ${signUpData.user.id}`);

    // Log the complete Supabase response for debugging
    console.log(`[create-user-and-verify] 🔍 SUPABASE RESPONSE AFTER USER CREATION:`);
    console.log(`[create-user-and-verify] ============================================`);
    console.log(`[create-user-and-verify] Full response data:`, JSON.stringify(signUpData, null, 2));
    console.log(`[create-user-and-verify] User object:`, JSON.stringify(signUpData.user, null, 2));
    console.log(`[create-user-and-verify] ============================================`);

    // Step 2: Generate verification link using generateLink (this creates the actual token)
    console.log(`[create-user-and-verify] Generating verification link with generateLink...`);
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: "signup",
      email: email,
      password: password,
      options: { 
        redirectTo: "https://auth.therai.co/auth/email"
      }
    });

    if (linkError) {
      console.error(`[create-user-and-verify] Link generation error:`, linkError);
      
      // Handle specific error cases for link generation
      if (linkError.message?.includes('already been registered') || 
          linkError.message?.includes('already registered') || 
          linkError.status === 422 || 
          linkError.code === 'email_exists') {
        return new Response(JSON.stringify({ 
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'EMAIL_EXISTS'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict status for already exists
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to generate verification link',
        code: 'LINK_GENERATION_FAILED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[create-user-and-verify] 🔗 GENERATED LINK DATA:`);
    console.log(`[create-user-and-verify] ============================================`);
    console.log(`[create-user-and-verify] Link data:`, JSON.stringify(linkData, null, 2));
    console.log(`[create-user-and-verify] Action link:`, linkData?.action_link);
    console.log(`[create-user-and-verify] Properties:`, JSON.stringify(linkData?.properties, null, 2));
    console.log(`[create-user-and-verify] ============================================`);

    const tokenLink = linkData?.action_link || "";
    const emailOtp = linkData?.properties?.email_otp || "";
    
    if (!tokenLink) {
      console.error(`[create-user-and-verify] No action_link in generateLink response`);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate verification link',
        code: 'LINK_GENERATION_FAILED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[create-user-and-verify] Verification link generated successfully`);
    console.log(`[create-user-and-verify] Token link: ${tokenLink}`);
    console.log(`[create-user-and-verify] Email OTP: ${emailOtp}`);

    // Step 3: Call email-verification Edge Function with the generated link and OTP
    const emailPayload = {
      user_id: signUpData.user.id,
      token_link: tokenLink,
      email_otp: emailOtp,
      template_type: "email_verification"
    };

    console.log(`[create-user-and-verify] 📧 EMAIL PAYLOAD TO SEND:`);
    console.log(`[create-user-and-verify] ============================================`);
    console.log(`[create-user-and-verify] user_id: ${emailPayload.user_id}`);
    console.log(`[create-user-and-verify] token_link: ${emailPayload.token_link}`);
    console.log(`[create-user-and-verify] email_otp: ${emailPayload.email_otp}`);
    console.log(`[create-user-and-verify] template_type: ${emailPayload.template_type}`);
    console.log(`[create-user-and-verify] ============================================`);

    const { error: emailError } = await supabaseClient.functions.invoke('email-verification', {
      body: emailPayload
    });

    if (emailError) {
      console.error(`[create-user-and-verify] Email sending error:`, emailError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send verification email',
        code: 'EMAIL_SEND_FAILED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[create-user-and-verify] Email verification sent successfully`);

    // Success case - verification email sent
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Verification email sent. Please check your inbox and click the verification link to complete registration.',
      user_id: signUpData.user.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[create-user-and-verify] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred during signup',
      code: 'UNEXPECTED_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
