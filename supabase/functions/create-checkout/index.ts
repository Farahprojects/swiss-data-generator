
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Stripe with the secret key from environment variables
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  try {
    console.log("Starting create-checkout function");
    const { mode, amount, priceId, productId, successUrl, cancelUrl } = await req.json();
    console.log(`Request data: mode=${mode}, amount=${amount}, priceId=${priceId}, productId=${productId}`);
    
    // Get user from Authorization header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.log("Invalid token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User authenticated:", userData.user.id);
    const user = userData.user;
    
    // Find existing Stripe customer or create new one
    let customerId;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = newCustomer.id;
      console.log("Created new customer:", customerId);
    }
    
    // Create session based on mode
    let session;
    
    if (mode === "payment") {
      console.log("Creating payment session");
      // For top-up credits payment
      if (priceId) {
        // Use the price ID directly if provided
        console.log("Using provided price ID:", priceId);
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer: customerId,
          line_items: [{
            price: priceId,
            quantity: 1,
          }],
          success_url: successUrl || `${req.headers.get("origin")}/dashboard?payment=success&amount=${amount}`,
          cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard?payment=cancelled`,
          metadata: {
            user_id: user.id,
          }
        });
      } else {
        // Fall back to creating a price on the fly
        console.log("Creating ad-hoc price");
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer: customerId,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: "API Credits Top-up",
              },
              unit_amount: amount * 100, // Convert dollars to cents
            },
            quantity: 1,
          }],
          success_url: successUrl || `${req.headers.get("origin")}/dashboard?payment=success&amount=${amount}`,
          cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard?payment=cancelled`,
          metadata: {
            user_id: user.id,
          }
        });
      }
    } else if (mode === "setup") {
      console.log("Creating payment method setup session");
      // For setting up or updating payment method
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "setup",
        customer: customerId,
        success_url: successUrl || `${req.headers.get("origin")}/dashboard/settings?panel=billing&payment=setup-success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard/settings?panel=billing&payment=setup-cancelled`,
      });
    } else {
      console.log("Invalid mode:", mode);
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'payment' or 'setup'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log for debugging
    console.log(`Checkout session created for ${mode} mode with ID: ${session.id}`);
    console.log(`Success URL: ${session.success_url}`);
    console.log(`Cancel URL: ${session.cancel_url}`);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
