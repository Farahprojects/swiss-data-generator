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
      email,
      isGuest,
      reportData,
      description,
    } = await req.json();

    console.log("🔄 Creating checkout with data:", { 
      mode, 
      amount, 
      priceId,
      isGuest: !!isGuest,
      email: isGuest ? email : "authenticated_user",
      hasReportData: !!reportData,
      description
    });

    if (mode === "payment" && !priceId && !amount) {
      throw new Error("For payment mode, either priceId or amount must be provided");
    }

    /* -------- Customer handling based on guest status -------- */
    let customerId: string;
    let customerEmail: string;
    let user: any = null;

    if (isGuest) {
      // Guest checkout flow
      if (!email || typeof email !== 'string') {
        throw new Error("Email is required for guest checkout");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      customerEmail = email;

      // Find or create guest customer in Stripe
      const custList = await stripe.customers.list({ email, limit: 1 });
      if (custList.data.length) {
        customerId = custList.data[0].id;
        console.log("🔍 Found existing Stripe customer for guest:", customerId);
      } else {
        const cust = await stripe.customers.create({
          email,
          metadata: { guest_checkout: "true" }
        });
        customerId = cust.id;
        console.log("🆕 Created new Stripe customer for guest:", customerId);
      }
    } else {
      // Signed-in user flow
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") || "",
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
      user = userRes.user;
      customerEmail = user.email;

      // Find or create customer for signed-in user
      const custList = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (custList.data.length) {
        customerId = custList.data[0].id;
        console.log("🔍 Found existing Stripe customer for user:", customerId);
      } else {
        const cust = await stripe.customers.create({
          email: customerEmail,
          metadata: { user_id: user.id },
        });
        customerId = cust.id;
        console.log("🆕 Created new Stripe customer for user:", customerId);
      }
    }

    /* -------- Success & cancel URLs -------- */
    const baseOrigin = req.headers.get("origin") || "";
    const paymentStatus = mode === "payment" ? "success" : "setup-success";
    const cancelStatus  = mode === "payment" ? "cancelled" : "setup-cancelled";

    let finalSuccessUrl: string;
    let finalCancelUrl: string;

    if (isGuest) {
      // For guests, use session_id format for verification
      finalSuccessUrl = successUrl ?? `${baseOrigin}/payment-return?session_id={CHECKOUT_SESSION_ID}`;
      finalCancelUrl = cancelUrl ?? `${baseOrigin}/payment-return?status=cancelled`;
    } else {
      // For signed-in users, use existing format
      finalSuccessUrl =
        successUrl ??
        `${baseOrigin}/payment-return?status=${paymentStatus}` +
          (mode === "payment" && amount ? `&amount=${amount}` : "");
      finalCancelUrl = cancelUrl ?? `${baseOrigin}/payment-return?status=${cancelStatus}`;
    }

    /* -------- Prepare metadata with location field mapping -------- */
    const metadata = isGuest
      ? {
          guest_checkout: "true",
          guest_email: email,
          amount: amount?.toString() || "",
          description: description || "Guest report",
          // Map location fields for translator compatibility
          location: reportData?.birthLocation || reportData?.location || "",
          secondPersonLocation: reportData?.secondPersonBirthLocation || "",
          // Keep original fields for completeness
          birthLocation: reportData?.birthLocation || "",
          secondPersonBirthLocation: reportData?.secondPersonBirthLocation || "",
          // Include all other report data
          ...(reportData || {}),
        }
      : {
          user_id: user.id,
          return_path: returnPath || "/dashboard",
        };

    console.log("📋 Session metadata prepared:", {
      isGuest: !!isGuest,
      metadataKeys: Object.keys(metadata),
      customerId,
      locationMapped: !!metadata.location,
      secondPersonLocationMapped: !!metadata.secondPersonLocation
    });

    /* -------- Create checkout session -------- */
    let session: Stripe.Checkout.Session;

    if (mode === "payment") {
      const common = {
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
                  product_data: { 
                    name: description || "Payment",
                    description: isGuest ? `Guest checkout: ${description}` : "API Credits Top-up"
                  },
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
        metadata: metadata,
        setup_intent_data: { metadata: metadata },
        customer_update:  { address: "auto" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'payment' or 'setup'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("✅ Stripe session created successfully:", {
      sessionId: session.id,
      url: session.url ? "URL_PROVIDED" : "NO_URL",
      customer: session.customer,
      amount_total: session.amount_total,
      isGuest: !!isGuest
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id, 
        url: session.url,
        debug: {
          isGuest: !!isGuest,
          successUrl: finalSuccessUrl,
          metadata: Object.keys(metadata),
          amount_cents: amount ? Math.round(amount * 100) : undefined,
          locationFieldsMapped: {
            location: !!metadata.location,
            secondPersonLocation: !!metadata.secondPersonLocation
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("❌ Error creating checkout session:", {
      message: err.message,
      stack: err.stack
    });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
