
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUBSCRIPTION-LINKER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Error getting user from token", userError);
      throw new Error("Authentication failed");
    }

    const user = userData.user;
    logStep("User authenticated", { id: user.id, email: user.email });

    // Check if this user has any pending stripe_users record
    const { data: stripeUser, error: stripeUserError } = await supabase
      .from('stripe_users')
      .select('*')
      .eq('email', user.email)
      .is('id', null)  // Only get records that haven't been linked to a user yet
      .maybeSingle();

    if (stripeUserError && stripeUserError.code !== 'PGRST116') {
      logStep("Error checking for stripe user", stripeUserError);
      throw new Error(`Database error: ${stripeUserError.message}`);
    }

    // If we found a pending record, link it
    if (stripeUser) {
      logStep("Found pending stripe record", { 
        stripeCustomerId: stripeUser.stripe_customer_id, 
        planName: stripeUser.plan_name 
      });

      // Call the account creator function with the user data
      const { error: createError } = await supabase.rpc('create_user_after_payment', {
        user_id: user.id,
        plan_type: stripeUser.plan_name || 'starter'
      });

      if (createError) {
        logStep("Error creating user records", createError);
        throw new Error(`Failed to create user records: ${createError.message}`);
      }

      // Update the stripe_users record with the user ID
      const { error: updateError } = await supabase
        .from('stripe_users')
        .update({ 
          id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .is('id', null);

      if (updateError) {
        logStep("Error updating stripe user", updateError);
        throw new Error(`Failed to link user to payment: ${updateError.message}`);
      }

      logStep("Successfully linked user to stripe record");
      
      // Update flow tracking
      try {
        const { error } = await supabase
          .from('stripe_flow_tracking')
          .update({ 
            flow_state: 'account_linked',
            user_id: user.id,
            updated_at: new Date().toISOString() 
          })
          .eq('email', user.email)
          .is('flow_state', 'payment_verified');
        
        if (error) {
          logStep("Warning: Could not update flow tracking", { error: error.message });
        }
      } catch (err) {
        // Non-blocking error
        logStep("Warning: Flow tracking update failed", { error: err.message });
      }

      return new Response(
        JSON.stringify({
          success: true,
          linked: true,
          planName: stripeUser.plan_name,
          message: "User account linked to payment"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check if user already has app_users and users records (already set up)
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (appUserError && appUserError.code !== 'PGRST116') {
      logStep("Error checking app_users", appUserError);
      throw new Error(`Database error: ${appUserError.message}`);
    }

    if (appUser) {
      logStep("User already has app_users record");
      return new Response(
        JSON.stringify({
          success: true,
          linked: false,
          existing: true,
          message: "User account already set up"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("No pending payment or existing account setup");
    return new Response(
      JSON.stringify({
        success: true,
        linked: false,
        existing: false,
        message: "No pending payment found for this user"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
