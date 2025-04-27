
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { priceIds, planType, addOns } = await req.json();
    console.log("Creating checkout for:", { priceIds, planType, addOns });

    const session = await stripe.checkout.sessions.create({
      customer_creation: "always",
      line_items: Array.isArray(priceIds) ? priceIds.map(priceId => ({
        price: priceId,
        quantity: 1,
      })) : [{ price: priceIds, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      collect_shipping_address: false,
      metadata: {
        planType,
        addOns: addOns ? JSON.stringify(addOns) : ''
      }
    });

    console.log(`Checkout session created: ${session.id}`);

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
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create checkout session",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
