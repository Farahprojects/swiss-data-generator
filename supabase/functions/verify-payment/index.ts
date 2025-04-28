
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
    console.log("Starting verify-payment function");
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      console.error("Missing sessionId in request body");
      throw new Error("Session ID is required");
    }

    console.log(`Processing payment verification for session: ${sessionId}`);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session with expanded data
    console.log("Retrieving checkout session from Stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'payment_intent']
    });

    if (!session) {
      console.error("No session found in Stripe");
      throw new Error("Session not found");
    }
    
    console.log(`Session found. Payment status: ${session.payment_status}`);

    // Create Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const email = session.customer_details?.email;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const planName = session.metadata?.planType;
    
    if (!email || !customerId) {
      console.error("Missing customer information", { email, customerId });
      throw new Error("Missing customer information");
    }

    // Parse add-ons from metadata
    let addOns: string[] = [];
    try {
      if (session.metadata?.addOns) {
        if (typeof session.metadata.addOns === 'string') {
          addOns = JSON.parse(session.metadata.addOns);
        }
      }
    } catch (error) {
      console.warn("Error parsing addOns from metadata:", error);
    }

    console.log("Preparing stripe user data", { email, planName, addOns });
    
    // Save the stripe user data
    const stripeUserData = {
      email: email,
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription?.id,
      plan_name: planName as 'Starter' | 'Growth' | 'Professional',
      addon_relationship_compatibility: addOns?.includes('Relationship Compatibility') || false,
      addon_yearly_cycle: addOns?.includes('Yearly Cycle') || false,
      addon_transit_12_months: addOns?.includes('Transits') || false,
      payment_status: session.payment_status,
      full_name: session.customer_details?.name || null,
      billing_address_line1: session.customer_details?.address?.line1 || null,
      billing_address_line2: session.customer_details?.address?.line2 || null,
      city: session.customer_details?.address?.city || null,
      state: session.customer_details?.address?.state || null,
      postal_code: session.customer_details?.address?.postal_code || null,
      country: session.customer_details?.address?.country || null,
      phone: session.customer_details?.phone || null,
    };

    console.log("Upserting stripe user data to database");
    const { error: upsertError } = await supabaseAdmin
      .from('stripe_users')
      .upsert(stripeUserData, {
        onConflict: 'stripe_customer_id'
      });

    if (upsertError) {
      console.error("Error upserting stripe user:", upsertError);
      throw upsertError;
    }
      
    console.log("Successfully saved stripe user data");
    
    return new Response(
      JSON.stringify({
        success: true,
        paymentStatus: session.payment_status,
        email: email,
        customerId: customerId,
        planType: planName
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
