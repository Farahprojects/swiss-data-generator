import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyTokenRequest {
  token: string;
  type: string;
  email?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, type, email }: VerifyTokenRequest = await req.json();
    
    console.log('[verify-token] Request:', { type, email: !!email, tokenLength: token?.length });

    if (!token || !type) {
      return new Response(
        JSON.stringify({ error: 'Token and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      // Verify the token using Supabase's verifyOtp method
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any,
        email: email
      });

      if (error) {
        console.error('[verify-token] Verification failed:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || 'Token verification failed' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[verify-token] Verification successful');
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: data.user,
          session: data.session 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (verifyError: any) {
      console.error('[verify-token] Verification error:', verifyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: verifyError.message || 'Token verification failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[verify-token] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
