
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ACCOUNT-CREATOR] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();
    logStep("Starting account creation", { userId, email });

    if (!userId || !email) {
      throw new Error("User ID and email are required");
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for matching stripe_user record
    const { data: stripeUser, error: stripeUserError } = await supabase
      .from('stripe_users')
      .select('*')
      .eq('email', email)
      .single();

    if (stripeUserError) {
      logStep("Error finding stripe user", stripeUserError);
      throw new Error(`No payment record found for email ${email}. Please contact support.`);
    }

    logStep("Found stripe user record", { 
      stripeCustomerId: stripeUser.stripe_customer_id, 
      planName: stripeUser.plan_name 
    });

    // Set API call limit based on plan
    let apiCallLimit = 50000; // Default limit
    switch (stripeUser.plan_name?.toLowerCase()) {
      case 'growth':
        apiCallLimit = 200000;
        break;
      case 'professional':
        apiCallLimit = 750000;
        break;
      default:
        apiCallLimit = 50000;
    }

    // Generate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase.rpc('generate_api_key');
    if (apiKeyError) {
      logStep("Error generating API key", apiKeyError);
      throw new Error(`Failed to generate API key: ${apiKeyError.message}`);
    }
    const apiKey = apiKeyData;
    logStep("Generated API key", { apiKeyLength: apiKey?.length });

    // Create transaction for consistent data
    const { error: txnError } = await supabase.rpc('create_user_after_payment', {
      user_id: userId,
      plan_type: stripeUser.plan_name || 'starter'
    });

    if (txnError) {
      logStep("Error in create_user_after_payment", txnError);
      throw new Error(`Failed to create user records: ${txnError.message}`);
    }

    logStep("Successfully created user records");
    
    // Update stripe_users with user_id
    const { error: updateError } = await supabase
      .from('stripe_users')
      .update({ 
        id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      logStep("Warning: Could not update stripe_users with user_id", updateError);
      // Non-blocking error
    } else {
      logStep("Updated stripe_users with user_id");
    }

    // Update flow tracking
    try {
      const { error } = await supabase
        .from('stripe_flow_tracking')
        .update({ 
          flow_state: 'account_created',
          user_id: userId,
          updated_at: new Date().toISOString() 
        })
        .eq('email', email)
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
        userId,
        planName: stripeUser.plan_name,
        message: "User account created and linked to payment"
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
