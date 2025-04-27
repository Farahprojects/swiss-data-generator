
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    
    // Require authentication
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          message: "You must be logged in to access this feature" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
    
    let userId = null;
    let userEmail = null;

    // Validate the token and get user info
    const token = authHeader.split(" ")[1];
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid authentication",
          message: "Your login session has expired or is invalid" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
    
    userId = data.user.id;
    userEmail = data.user.email;
    
    // Parse the body
    const body = await req.json();
    const { priceIds, successUrl = "/signup?success=true", cancelUrl = "/pricing?canceled=true" } = body;
    console.log("Creating checkout for priceIds:", priceIds);

    // Process the request
    const priceIdsArray = Array.isArray(priceIds) ? priceIds : [priceIds];

    let customerId;
    if (userEmail) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const line_items = priceIdsArray.map(priceId => ({
      price: priceId,
      quantity: 1,
    }));

    // Get origin from request or use a default
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail, // Only set if no customer ID exists
      line_items,
      mode: "subscription",
      success_url: `${origin}${successUrl}`,
      cancel_url: `${origin}${cancelUrl}`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      client_reference_id: userId,
    });

    console.log(`Checkout session created: ${session.id}`);

    // Return both the URL and the session ID
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        isDevelopment: true // This helps the frontend know we're in development
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create checkout session",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
