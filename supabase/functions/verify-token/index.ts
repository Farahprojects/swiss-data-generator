import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const respond = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return respond({ 
        success: false, 
        error: 'Missing required parameter: token' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[verify-token] Verifying token: ${token}`);

    // Look up email from token_hash mapping (stored when link was generated)
    console.log(`[verify-token] Looking up email for token_hash...`);
    const { data: mappingData, error: mappingError } = await supabase
      .from('password_reset_tokens')
      .select('email, expires_at')
      .eq('token_hash', token)
      .single();

    if (mappingError || !mappingData) {
      console.error(`[verify-token] Token not found in mapping:`, mappingError);
      return respond({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, 400);
    }

    // Check if token has expired
    if (new Date() > new Date(mappingData.expires_at)) {
      console.error(`[verify-token] Token has expired`);
      return respond({ 
        success: false, 
        error: 'Token has expired' 
      }, 400);
    }

    const email = mappingData.email;
    console.log(`[verify-token] Found email for token: ${email}`);

    // Now verify the OTP with the email and token_hash
    console.log(`[verify-token] Verifying OTP with email and token_hash...`);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'recovery'
    });

    if (error) {
      console.error(`[verify-token] OTP verification failed:`, error);
      return respond({ 
        success: false, 
        error: error.message || 'Token verification failed' 
      }, 400);
    }

    if (!data.user) {
      console.error(`[verify-token] No user returned from verification`);
      return respond({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }

    console.log(`[verify-token] ✓ Token verified successfully for user: ${data.user.id}`);

    // Return the session data for the frontend to use
    return respond({
      success: true,
      message: 'Token verified successfully',
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('[verify-token] Unexpected error:', error);
    return respond({ 
      success: false, 
      error: 'Internal server error' 
    }, 500);
  }
});