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
    const body = await req.json();
    
    // STAGE 1: Detect new minimal format vs legacy format
    const isStage1Format = body.guest_report_id && !body.mode && !body.isGuest;
    
    if (isStage1Format) {
      // STAGE 1: Minimal data format
      const {
        guest_report_id,
        amount,
        email,
        description,
        successUrl,
        cancelUrl,
      } = body;

      console.log("🔄 STAGE 1: Creating checkout with minimal data:", { 
        guest_report_id, 
        amount, 
        email, 
        description
      });

      /* -------- STAGE 1 Validation -------- */
      if (!guest_report_id || typeof guest_report_id !== 'string') {
        throw new Error("Guest report ID is required");
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error("Amount must be a positive number");
      }
      if (amount < 1 || amount > 500) {
        throw new Error("Amount must be between $1 and $500");
      }
      if (!email || typeof email !== 'string') {
        throw new Error("Email is required");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }
      if (!description || typeof description !== 'string' || description.trim().length < 5) {
        throw new Error("Description must be at least 5 characters long");
      }

      console.log("✅ Stage 1 validation passed");

      /* -------- Find / create customer -------- */
      let customerId: string;
      const custList = await stripe.customers.list({ email: email, limit: 1 });
      if (custList.data.length) {
        customerId = custList.data[0].id;
        console.log("🔍 Found existing Stripe customer:", customerId);
      } else {
        const cust = await stripe.customers.create({
          email: email,
          metadata: { guest_checkout: "true" },
        });
        customerId = cust.id;
        console.log("🆕 Created new Stripe customer:", customerId);
      }

      /* -------- Success & cancel URLs - USE PASSED URLS -------- */
      const baseOrigin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL") || "https://therai.co";
      
      // Use /chat for better UX control  
      const finalSuccessUrl = successUrl ?? `${baseOrigin}/chat?guest_id=${guest_report_id}&session_id={CHECKOUT_SESSION_ID}&status=success`;
      const finalCancelUrl = cancelUrl ?? `${baseOrigin}/stripe-return?guest_id=${guest_report_id}&status=cancelled`;
      
      console.log("🔗 Success URL:", finalSuccessUrl);
      console.log("🔗 Cancel URL:", finalCancelUrl);

      /* -------- Create checkout session with MINIMAL metadata -------- */
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"] as const,
        mode: "payment" as const,
        customer: customerId,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
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
                description: `Report purchase: ${description}`,
              },
              unit_amount: Math.round(amount * 100), // Convert dollars to cents
            },
            quantity: 1,
          },
        ],
        // STAGE 1: Only store guest_report_id in metadata - single source of truth
        metadata: {
          guest_report_id: guest_report_id,
          purchase_type: "report",
        },
        // Use guest_report_id as client_reference_id for webhook lookup
        client_reference_id: guest_report_id
      });

      console.log("✅ STAGE 1: Stripe session created with minimal metadata:", {
        sessionId: session.id,
        url: session.url ? "URL_PROVIDED" : "NO_URL",
        customer: session.customer,
        amount_total: session.amount_total,
        guest_report_id: guest_report_id
      });

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          debug: {
            successUrl: finalSuccessUrl,
            guest_report_id: guest_report_id,
            amount_cents: Math.round(amount * 100),
            stage1_architecture: true
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // LEGACY FORMAT: Continue with existing logic
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
    } = body;

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
    const baseOrigin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL") || "https://therai.co";
    const paymentStatus = mode === "payment" ? "success" : "setup-success";
    const cancelStatus  = mode === "payment" ? "cancelled" : "setup-cancelled";

    let finalSuccessUrl: string;
    let finalCancelUrl: string;

    if (isGuest) {
      // For guests, use session_id format for verification
      finalSuccessUrl = successUrl ?? `${baseOrigin}/stripe-return?session_id={CHECKOUT_SESSION_ID}&status=success`;
      finalCancelUrl = cancelUrl ?? `${baseOrigin}/stripe-return?status=cancelled`;
    } else {
      // For signed-in users, use existing format
      finalSuccessUrl =
        successUrl ??
        `${baseOrigin}/stripe-return?status=${paymentStatus}` +
          (mode === "payment" && amount ? `&amount=${amount}` : "");
      finalCancelUrl = cancelUrl ?? `${baseOrigin}/stripe-return?status=cancelled`;
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
