
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    logStep("Starting verification", { sessionId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Retrieved session", { 
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email
    });

    if (!session.customer_details?.email) {
      throw new Error("No customer email found in session");
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeUserData = {
      email: session.customer_details.email,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripe_subscription_id: session.subscription?.id,
      plan_name: session.metadata?.planType as 'Starter' | 'Growth' | 'Professional',
      payment_status: session.payment_status,
      full_name: session.customer_details.name,
      billing_address_line1: session.customer_details.address?.line1,
      billing_address_line2: session.customer_details.address?.line2,
      city: session.customer_details.address?.city,
      state: session.customer_details.address?.state,
      postal_code: session.customer_details.address?.postal_code,
      country: session.customer_details.address?.country,
      phone: session.customer_details.phone,
      updated_at: new Date().toISOString()
    };

    logStep("Upserting stripe user data", stripeUserData);

    const { error: upsertError } = await supabase
      .from('stripe_users')
      .upsert(stripeUserData);

    if (upsertError) {
      logStep("Error upserting user", upsertError);
      throw upsertError;
    }

    // Get user id using auth admin API
    logStep("Looking up user by email", { email: session.customer_details.email });
    
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      logStep("Error fetching users list", usersError);
      throw usersError;
    }

    const user = usersData.users.find(u => u.email === session.customer_details.email);
    if (!user) {
      logStep("No user found with email", { email: session.customer_details.email });
      throw new Error("No user found with email");
    }

    logStep("Found user", { user_id: user.id });

    logStep("Calling create_user_after_payment RPC", { 
      user_id: user.id, 
      plan_type: session.metadata?.planType 
    });

    // Call the RPC function to create user records
    const { error: rpcError } = await supabase.rpc('create_user_after_payment', {
      user_id: user.id,
      plan_type: session.metadata?.planType || 'starter'
    });

    if (rpcError) {
      logStep("Error calling create_user_after_payment", rpcError);
      throw rpcError;
    }

    logStep("Successfully created user records");

    return new Response(
      JSON.stringify({
        success: true,
        email: session.customer_details.email,
        paymentStatus: session.payment_status,
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
