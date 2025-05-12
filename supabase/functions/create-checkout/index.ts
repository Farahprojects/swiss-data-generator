import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/*  pin Stripe & Supabase imports to the same std version  */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

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
      mode,
      amount,
      priceId,
      productId,
      successUrl,
      cancelUrl,
      returnPath,
      returnTab,
    } = await req.json();

    if (mode === "payment" && !priceId && !amount) {
      throw new Error("For payment mode, either priceId or amount must be provided");
    }

    /* -------- User auth -------- */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")  || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const user = userRes.user;

    /* -------- Find / create customer -------- */
    let customerId: string;
    const custList = await stripe.customers.list({ email: user.email, limit: 1 });
    if (custList.data.length) {
      customerId = custList.data[0].id;
    } else {
      const cust = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
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
          user_id: user.id,
          return_path: returnPath || "/dashboard",
          return_tab:  returnTab  || "",
        },
        payment_intent_data: {
          metadata: { user_id: user.id },
          setup_future_usage: "off_session" as const,
        },
        setup_intent_data: { metadata: { user_id: user.id } },
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
                  product_data: { name: "API Credits Top-up", description: "Top up your API credits" },
                  unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
              },
            ],
          });
    } else if (mode === "setup") {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "setup",
        customer: customerId,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          user_id: user.id,
          return_path: returnPath || "/dashboard/settings",
          return_tab:  returnTab  || "panel=billing",
        },
        setup_intent_data: { metadata: { user_id: user.id } },
        customer_update:  { address: "auto" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'payment' or 'setup'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
