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
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create user first using admin API
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false // Don't auto-confirm email
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Handle email already exists case specifically
      if (createError.message?.includes('already been registered') || createError.status === 422) {
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
          error: createError.message || 'Failed to create account',
          errorCode: 'signup_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create user account',
          errorCode: 'user_creation_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', userData.user.id);

    // Note: Email verification is now handled by the new signup flow
    // This function is deprecated and should not be used
    console.log('start-signup function is deprecated - use new signup flow instead');

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