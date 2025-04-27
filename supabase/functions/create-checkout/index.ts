
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { priceIds, planType, addOns, email } = await req.json();
    console.log("Creating checkout for:", { priceIds, planType, addOns, email });

    if (!email) {
      throw new Error("Email is required");
    }

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: Array.isArray(priceIds) ? priceIds.map(priceId => ({
        price: priceId,
        quantity: 1,
      })) : [{ price: priceIds, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      collect_shipping_address: false,
      metadata: {
        planType,
        addOns: addOns ? JSON.stringify(addOns) : '',
        email
      }
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        planType,
        addOns,
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
