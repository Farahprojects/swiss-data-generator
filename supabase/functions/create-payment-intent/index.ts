import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.168.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-08-16" });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, currency, guest_id, chat_id, description, plan_id, source } = await req.json();

    // For paywall payments, validate plan_id and get amount from database
    if (source === 'paywall' && plan_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Look up the plan details from price_list table
      const { data: planData, error: planError } = await supabase
        .from('price_list')
        .select('unit_price_usd, name, description')
        .eq('id', plan_id)
        .single();

      if (planError || !planData) {
        return new Response(JSON.stringify({ error: "Invalid plan ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use server-side validated amount and description
      const validatedAmount = planData.unit_price_usd;
      const validatedDescription = planData.description || planData.name;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedAmount * 100),
        currency: (currency || "usd") as Stripe.Currency,
        description: validatedDescription,
        metadata: {
          guest_id: guest_id || "",
          chat_id: chat_id || "",
          plan_id: plan_id,
          source: 'paywall'
        },
        automatic_payment_methods: { enabled: true },
      });

      return new Response(
        JSON.stringify({ 
          client_secret: paymentIntent.client_secret,
          amount: validatedAmount,
          description: validatedDescription
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Legacy conversation payment flow (keep existing logic)
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = {
      guest_id: guest_id || "",
      chat_id: chat_id || "",
    };

    console.log('[create-payment-intent] Creating PaymentIntent with metadata:', metadata);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: (currency || "usd") as Stripe.Currency,
      description: description || "Checkout",
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    console.log('[create-payment-intent] PaymentIntent created:', {
      id: paymentIntent.id,
      metadata: paymentIntent.metadata
    });

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


