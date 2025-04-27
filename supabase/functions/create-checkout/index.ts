
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { priceIds } = await req.json();
    console.log("Creating checkout for priceIds:", priceIds);

    const priceIdsArray = Array.isArray(priceIds) ? priceIds : [priceIds];

    const line_items = priceIdsArray.map(priceId => ({
      price: priceId,
      quantity: 1,
    }));

    // Create Stripe checkout session without customer information
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/signup?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        isDevelopment: true
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
