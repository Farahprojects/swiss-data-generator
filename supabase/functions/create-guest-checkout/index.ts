
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

    console.log("🔄 Creating guest checkout with data:", { 
      amount, 
      email, 
      description, 
      hasReportData: !!reportData,
      reportDataKeys: reportData ? Object.keys(reportData) : []
    });

    /* -------- Validation -------- */
    
    // 1. Validate amount - must be provided, positive, and reasonable
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.error("❌ Invalid amount:", amount);
      throw new Error("Amount must be a positive number");
    }
    if (amount < 1 || amount > 500) {
      console.error("❌ Amount out of range:", amount);
      throw new Error("Amount must be between $1 and $500");
    }

    // 2. Validate email - must be provided and valid format
    if (!email || typeof email !== 'string') {
      console.error("❌ Missing email");
      throw new Error("Email is required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("❌ Invalid email format:", email);
      throw new Error("Invalid email format");
    }

    // 3. Validate description - must be clear and non-empty
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      console.error("❌ Invalid description:", description);
      throw new Error("Description must be at least 5 characters long");
    }

    console.log("✅ Validation passed");

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

    /* -------- Success & cancel URLs with session ID -------- */
    const baseOrigin = req.headers.get("origin") || Deno.env.get("SUPABASE_URL") || "https://therai.com";
    
    // Redirect back to main app with success/cancel status and proper guest_id handling
    const finalSuccessUrl = successUrl ?? `${baseOrigin}/report?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl ?? `${baseOrigin}/report?status=cancelled`;
    
    console.log("🔗 Success URL:", finalSuccessUrl);
    console.log("🔗 Cancel URL:", finalCancelUrl);

    /* -------- Create checkout session with direct amount -------- */
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
              description: `Direct charge for: ${description}`,
            },
            unit_amount: Math.round(amount * 100), // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
    });

    /* -------- Prepare metadata for report generation -------- */
    const metadata = {
      guest_checkout: "true",
      guest_email: email,
      amount: amount.toString(),
      description: description,
      stripe_session_id: session.id, // Add session ID for better tracking
      // Include all report data in metadata for later retrieval
      ...(reportData || {}),
    };

    console.log("📋 Session metadata prepared with keys:", Object.keys(metadata));

    // Update the session with metadata (Stripe doesn't allow metadata in create for checkout sessions)
    // We'll add it to the payment intent instead when it's created
    console.log("✅ Stripe session created successfully:", {
      sessionId: session.id,
      url: session.url ? "URL_PROVIDED" : "NO_URL",
      customer: session.customer,
      amount_total: session.amount_total
    });

    // If this is a service purchase, we need to ensure the payment intent gets the metadata
    if (reportData?.purchase_type === 'service') {
      console.log("🛍️ Service purchase detected, metadata will be attached via webhook");
    }

    return new Response(
      JSON.stringify({ 
        sessionId: session.id, 
        url: session.url,
        debug: {
          successUrl: finalSuccessUrl,
          metadata: Object.keys(metadata),
          amount_cents: Math.round(amount * 100),
          isServicePurchase: reportData?.purchase_type === 'service'
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("❌ Error creating guest checkout session:", {
      message: err.message,
      stack: err.stack
    });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
