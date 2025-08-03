import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Parse request body
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a secure random password for the guest user
    const password = crypto.randomUUID();

    // Create the guest user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        is_guest: true,
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('Error creating guest user:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create guest user',
          details: authError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'No user data returned' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate a session for the guest user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: {
          is_guest: true
        }
      }
    });

    if (sessionError) {
      console.error('Error generating session for guest user:', sessionError);
      // Don't fail here - the user was created successfully
    }

    // Return the user data and session
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          is_guest: true
        },
        session: sessionData?.properties?.action_link || null,
        message: 'Guest user created successfully'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error in create-guest-user:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}); 