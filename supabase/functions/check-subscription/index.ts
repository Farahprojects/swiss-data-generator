import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get customer from Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      // No customer found, mark as inactive
      await supabaseClient.from("profiles").upsert({
        id: user.id,
        email: user.email,
        subscription_active: false,
        last_payment_status: "no_customer",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      });
      
      return new Response(JSON.stringify({ 
        subscription_active: false, 
        subscription_plan: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const isActive = subscriptions.data.length > 0;
    let subscriptionData = {
      subscription_active: false,
      subscription_plan: null,
      subscription_start_date: null,
      subscription_next_charge: null,
      stripe_subscription_id: null,
      last_payment_status: "inactive",
    };

    if (isActive) {
      const subscription = subscriptions.data[0];
      subscriptionData = {
        subscription_active: true,
        subscription_plan: "10_monthly",
        subscription_start_date: new Date(subscription.created * 1000).toISOString(),
        subscription_next_charge: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscription.id,
        last_payment_status: "active",
      };
    }

    // Update profile with subscription data
    await supabaseClient.from("profiles").upsert({
      id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      ...subscriptionData,
    });

    return new Response(JSON.stringify({
      subscription_active: subscriptionData.subscription_active,
      subscription_plan: subscriptionData.subscription_plan,
      subscription_next_charge: subscriptionData.subscription_next_charge,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error checking subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});