
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-VERIFY] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    logStep("Starting verification", { sessionId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Retrieved session", { 
      payment_status: session.payment_status,
      customer: session.customer,
      customer_email: session.customer_details?.email
    });

    if (!session.customer || !session.customer_details?.email) {
      throw new Error("No customer information found in session");
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    logStep("Customer ID extracted", { customerId });

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Prepare user data for upsert
    const userData = {
      email: session.customer_details.email,
      stripe_customer_id: customerId,
      plan_name: session.metadata?.planType || 'starter',
      payment_status: session.payment_status,
      full_name: session.customer_details.name,
      billing_address_line1: session.customer_details.address?.line1,
      billing_address_line2: session.customer_details.address?.line2,
      city: session.customer_details.address?.city,
      state: session.customer_details.address?.state,
      postal_code: session.customer_details.address?.postal_code,
      country: session.customer_details.address?.country,
      phone: session.customer_details.phone,
      updated_at: new Date().toISOString()
    };
    
    logStep("Attempting to upsert user data", userData);

    const { error: upsertError } = await supabase
      .from('stripe_users')
      .upsert(userData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      logStep("Error upserting user", upsertError);
      throw new Error(`Failed to save user data: ${upsertError.message}`);
    }

    // Update flow tracking
    try {
      const { error } = await supabase
        .from('stripe_flow_tracking')
        .update({ flow_state: 'payment_verified', updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
      
      if (error) {
        logStep("Warning: Could not update flow tracking", { error: error.message });
      }
    } catch (err) {
      // Non-blocking error
      logStep("Warning: Flow tracking update failed", { error: err.message });
    }

    logStep("Successfully saved user data");

    return new Response(
      JSON.stringify({
        success: true,
        email: session.customer_details.email,
        paymentStatus: session.payment_status,
        planType: session.metadata?.planType || 'starter',
        customerId: customerId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
