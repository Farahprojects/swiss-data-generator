
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/*  pin Stripe & Supabase imports to the same std version  */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  /* ──────────────  CORS pre-flight  ────────────── */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  /* ──────────────  Stripe init  ────────────── */
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2024-04-10",
  });

  try {
    /* -------- Request body -------- */
    const {
      mode = "payment",
      amount,
      priceId,
      productId,
      email,
      successUrl,
      cancelUrl,
    } = await req.json();

    if (!email) {
      throw new Error("Email is required for guest checkout");
    }

    if (mode === "payment" && !priceId && !amount) {
      throw new Error("For payment mode, either priceId or amount must be provided");
    }

    /* -------- Find / create customer -------- */
    let customerId: string;
    const custList = await stripe.customers.list({ email: email, limit: 1 });
    if (custList.data.length) {
      customerId = custList.data[0].id;
    } else {
      const cust = await stripe.customers.create({
        email: email,
        metadata: { guest_checkout: "true" },
      });
      customerId = cust.id;
    }

    /* -------- Success & cancel URLs -------- */
    const baseOrigin = req.headers.get("origin") || "";
    const paymentStatus = mode === "payment" ? "success" : "setup-success";
    const cancelStatus  = mode === "payment" ? "cancelled" : "setup-cancelled";

    const finalSuccessUrl =
      successUrl ??
      `${baseOrigin}/payment-return?status=${paymentStatus}` +
        (mode === "payment" && amount ? `&amount=${amount}` : "");
    const finalCancelUrl =
      cancelUrl ?? `${baseOrigin}/payment-return?status=${cancelStatus}`;

    /* -------- Create checkout session -------- */
    let session: Stripe.Checkout.Session;

    if (mode === "payment") {
      const common = {
        payment_method_types: ["card"] as const,
        mode: "payment" as const,
        customer: customerId,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          guest_checkout: "true",
          guest_email: email,
        },
        payment_intent_data: {
          metadata: { 
            guest_checkout: "true",
            guest_email: email,
          },
          setup_future_usage: "off_session" as const,
        },
        billing_address_collection: "auto" as const,
        allow_promotion_codes: true,
        customer_update: { address: "auto" as const },
        custom_text: { submit: { message: "Your payment is securely processed by Stripe." } },
      };

      session = priceId
        ? await stripe.checkout.sessions.create({
            ...common,
            line_items: [{ price: priceId, quantity: 1 }],
          })
        : await stripe.checkout.sessions.create({
            ...common,
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "Astrology Report", description: "Professional astrology report" },
                  unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
              },
            ],
          });
    } else {
      return new Response(
        JSON.stringify({ error: "Setup mode not supported for guest checkout" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error creating guest checkout session:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
