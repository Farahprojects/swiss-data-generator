
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
    const { planType, addOns } = await req.json();
    logStep("Starting checkout process", { planType, addOns });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role key for flow tracking
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const origin = req.headers.get("origin") || "";
    const successUrl = `${origin}/signup?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${planType}`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    logStep("Creating session with URLs", { successUrl, cancelUrl });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        planType,
        addOns: addOns ? JSON.stringify(addOns) : ''
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Create flow tracking record
    const { error: trackingError } = await supabase
      .from('stripe_flow_tracking')
      .insert({
        session_id: session.id,
        flow_state: 'checkout_initiated',
        plan_type: planType,
        add_ons: addOns,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        metadata: {
          success_url: successUrl,
          cancel_url: cancelUrl,
          created_at: new Date().toISOString()
        }
      });

    if (trackingError) {
      logStep("Warning: Flow tracking insert failed", { error: trackingError.message });
    } else {
      logStep("Flow tracking record created");
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
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
