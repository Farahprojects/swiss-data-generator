import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0";

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
    const { amount, currency, guest_id, chat_id, description } = await req.json();

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


