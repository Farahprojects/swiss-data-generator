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
    const { token, email, type } = await req.json();

    if (!token || !email || !type) {
      return respond({ 
        success: false, 
        error: 'Missing required parameters: token, email, type' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[verify-token] Verifying ${type} token for ${email}`);

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any, // 'signup' | 'recovery' | 'email_change'
      email: email,
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

    // For recovery type, we need to establish a session
    if (type === 'recovery') {
      // The verifyOtp should have already established a session
      // Return the session data for the frontend to use
      return respond({
        success: true,
        message: 'Token verified successfully',
        session: data.session,
        user: data.user
      });
    }

    // For other types (signup, email_change), just return success
    return respond({
      success: true,
      message: 'Token verified successfully',
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