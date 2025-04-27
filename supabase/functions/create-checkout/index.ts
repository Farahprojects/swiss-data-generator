
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId } = await req.json();
    console.log("Received priceId:", priceId);
    
    if (!priceId) {
      throw new Error("Price ID is required");
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Modified to support guest checkout
    let customerEmail = null;
    let user = null;
    
    // Try to get authenticated user if token exists
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Create Supabase client
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabaseClient.auth.getUser(token);
      
      if (!error && data?.user) {
        user = data.user;
        customerEmail = user.email;
        console.log("Authenticated user:", customerEmail);
      }
    }

    // Guest checkout - no user information needed for creating the session
    console.log(customerEmail ? "Creating checkout for authenticated user" : "Creating checkout for guest");

    // Check if we have a customer for this email
    let customerId;
    if (customerEmail) {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Found existing customer:", customerId);
      }
    }

    console.log("Creating checkout session with price:", priceId);
    
    // For relationship compatibility or any product ID, handle the product ID case
    let lineItems;
    if (priceId.startsWith('prod_')) {
      // This is a product ID, we need to find a price ID for this product
      console.log("Product ID detected, looking up associated price");
      const prices = await stripe.prices.list({
        product: priceId,
        active: true,
        limit: 1
      });
      
      if (prices.data.length === 0) {
        throw new Error("No active price found for the product");
      }
      
      console.log("Found price ID for product:", prices.data[0].id);
      lineItems = [{
        price: prices.data[0].id,
        quantity: 1,
      }];
    } else {
      // This is already a price ID
      lineItems = [{
        price: priceId,
        quantity: 1,
      }];
    }
    
    const origin = req.headers.get("origin") || "http://localhost:3000";
    console.log("Origin URL:", origin);
    
    // After successful payment, redirect to signup if guest or dashboard if authenticated
    const successUrl = `${origin}/${user ? 'dashboard' : 'signup'}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/pricing`;
    
    console.log("Success URL:", successUrl);
    console.log("Cancel URL:", cancelUrl);
    
    // Create checkout session with optional customer details
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail, // Only include email if not using customerId
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Collect name and email if it's a guest checkout
      billing_address_collection: !customerEmail ? "required" : undefined,
      customer_creation: !customerId && !customerEmail ? "always" : undefined,
    });

    console.log("Checkout session created successfully:", session.id);
    console.log("Checkout URL:", session.url);
    
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
