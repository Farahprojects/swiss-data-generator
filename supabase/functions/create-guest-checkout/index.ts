
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
      amount,
      email,
      description,
      successUrl,
      cancelUrl,
      reportData, // New: report details for metadata
    } = await req.json();

    console.log("Creating guest checkout:", { amount, email, description, reportData });

    /* -------- Validation -------- */
    
    // 1. Validate amount - must be provided, positive, and reasonable
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    if (amount < 1 || amount > 500) {
      throw new Error("Amount must be between $1 and $500");
    }

    // 2. Validate email - must be provided and valid format
    if (!email || typeof email !== 'string') {
      throw new Error("Email is required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // 3. Validate description - must be clear and non-empty
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      throw new Error("Description must be at least 5 characters long");
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

    /* -------- Success & cancel URLs with session ID -------- */
    const baseOrigin = req.headers.get("origin") || "";
    const finalSuccessUrl = successUrl ?? `${baseOrigin}/payment-return?session_id={CHECKOUT_SESSION_ID}&status=success&amount=${amount}`;
    const finalCancelUrl = cancelUrl ?? `${baseOrigin}/payment-return?status=cancelled`;

    /* -------- Prepare metadata for report generation -------- */
    const metadata = {
      guest_checkout: "true",
      guest_email: email,
      amount: amount.toString(),
      description: description,
      // Include all report data in metadata for later retrieval
      ...(reportData || {}),
    };

    console.log("Session metadata:", metadata);

    /* -------- Create checkout session with direct amount -------- */
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"] as const,
      mode: "payment" as const,
      customer: customerId,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: metadata,
      payment_intent_data: {
        metadata: metadata,
        setup_future_usage: "off_session" as const,
      },
      billing_address_collection: "auto" as const,
      allow_promotion_codes: true,
      customer_update: { address: "auto" as const },
      custom_text: { submit: { message: "Your payment is securely processed by Stripe." } },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: description,
              description: `Direct charge for: ${description}`,
            },
            unit_amount: Math.round(amount * 100), // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
    });

    console.log("Session created:", session.id);

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
