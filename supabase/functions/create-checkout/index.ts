
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting checkout process");
    const { priceIds, planType, addOns } = await req.json();
    logStep("Request data", { priceIds, planType, addOns });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const successUrl = new URL(`${req.headers.get("origin")}/signup`);
    successUrl.searchParams.append('success', 'true');
    successUrl.searchParams.append('session_id', '{CHECKOUT_SESSION_ID}');
    successUrl.searchParams.append('plan', planType);

    const cancelUrl = new URL(`${req.headers.get("origin")}/pricing`);
    cancelUrl.searchParams.append('canceled', 'true');

    const session = await stripe.checkout.sessions.create({
      line_items: Array.isArray(priceIds) ? priceIds.map(priceId => ({
        price: priceId,
        quantity: 1,
      })) : [{ price: priceIds, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        planType,
        addOns: addOns ? JSON.stringify(addOns) : ''
      }
    });

    logStep("Checkout session created", { 
      sessionId: session.id,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString()
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        planType,
        addOns
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("Error creating checkout session", { error: error.message });
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create checkout session",
        details: "Please try again or contact support if the issue persists."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

