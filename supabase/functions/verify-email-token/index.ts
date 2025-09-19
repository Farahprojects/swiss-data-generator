import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  const log = (...args: any[]) => console.log(`[VERIFY-EMAIL:${requestId}]`, ...args);

  // Log request details
  log("Request received:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

         // JWT verification disabled in config.toml
         // No authorization check needed

  try {
    const { token, email, type } = await req.json();
    
    log("Verification request:", { 
      hasToken: !!token, 
      hasEmail: !!email, 
      type,
      tokenLength: token?.length 
    });

    if (!token || !email || !type) {
      log("Missing required parameters");
      return new Response(
        JSON.stringify({ success: false, error: "Missing token, email, or type" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      log("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Supabase's built-in verification API
    log("Verifying token with Supabase auth API...");
    
    // Extract token from the full URL if needed
    let verificationToken = token;
    if (token.includes('#')) {
      const hashParams = new URLSearchParams(token.split('#')[1]);
      verificationToken = hashParams.get('access_token') || token;
    }

    // Verify the token using Supabase's admin API
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.verifyOtp({
      token_hash: verificationToken,
      type: type === 'signup' ? 'signup' : 'email'
    });

    if (verifyError) {
      log("Token verification failed:", verifyError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid verification link or link has expired" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!verifyData.user) {
      log("No user returned from verification");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Verification failed - no user found" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log("✅ Email verification successful via Supabase:", {
      userId: verifyData.user.id,
      email: verifyData.user.email,
      emailConfirmed: verifyData.user.email_confirmed_at
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        userId: verifyData.user.id,
        email: verifyData.user.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
