// @ts-nocheck - Deno runtime, types checked at deployment
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Get planId from request body
    const { planId, successUrl, cancelUrl } = await req.json();
    const selectedPlanId = planId || "subscription1"; // Default to subscription1 if not provided

    // Fetch pricing from database
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from("price_list")
      .select("name, description, unit_price_usd")
      .eq("id", selectedPlanId)
      .single();

    let pricing;
    if (pricingError) {
      // Fallback pricing
      pricing = {
        name: "Premium Subscription",
        description: "Unlimited chats and actionable AI insights",
        unit_price_usd: 10.00
      };
    } else {
      pricing = pricingData;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Find or create customer and immediately update profiles
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Immediately update profiles table with stripe_customer_id
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    await serviceClient.from("profiles").upsert({
      id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
    });

    const origin = req.headers.get("origin") || "https://api.therai.co";

    // Create subscription checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: pricing.name,
              description: pricing.description
            },
            unit_amount: Math.round(pricing.unit_price_usd * 100), // Convert to cents
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/subscription-paywall?subscription=cancelled`,
      client_reference_id: user.id, // Critical for webhook resolution
      metadata: {
        user_id: user.id,
        subscription_plan: selectedPlanId,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          subscription_plan: selectedPlanId,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});