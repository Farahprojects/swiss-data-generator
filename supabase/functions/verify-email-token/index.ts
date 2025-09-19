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

    // Check if token exists in profiles table
    log("Checking profile for token...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, email_verified, verification_token')
      .eq('verification_token', token)
      .eq('email', email)
      .single();

    if (profileError || !profileData) {
      log("Token not found or invalid:", profileError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid verification link or link has expired" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log("Token found, profile data:", {
      userId: profileData.id,
      email: profileData.email,
      alreadyVerified: profileData.email_verified
    });

    // Check if already verified
    if (profileData.email_verified) {
      log("Email already verified");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email already verified",
          alreadyVerified: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark email as verified and clear token
    log("Marking email as verified and clearing token...");
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        email_verified: true,
        verification_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('verification_token', token);

    if (updateError) {
      log("Failed to update profile:", updateError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to verify email" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log("✅ Email verification successful");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        userId: profileData.id
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
