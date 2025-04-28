
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Simplified URL handling
    const origin = req.headers.get("origin") || "";
    const successUrl = `${origin}/signup?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${planType}`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    logStep("Creating session with URLs", { successUrl, cancelUrl });

    const session = await stripe.checkout.sessions.create({
      line_items: Array.isArray(priceIds) ? priceIds.map(priceId => ({
        price: priceId,
        quantity: 1,
      })) : [{ price: priceIds, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        planType,
        addOns: addOns ? JSON.stringify(addOns) : '',
        flow_state: 'checkout_created',
        created_at: new Date().toISOString()
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Store the initial session information (optional, helps with debugging)
    try {
      const { error } = await supabase
        .from('stripe_flow_tracking')
        .insert({
          session_id: session.id,
          flow_state: 'checkout_created',
          plan_type: planType,
          add_ons: addOns,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        logStep("Warning: Could not track flow", { error: error.message });
      }
    } catch (err) {
      // Non-blocking error - just log it
      logStep("Warning: Flow tracking failed", { error: err.message });
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("Error creating checkout session", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
