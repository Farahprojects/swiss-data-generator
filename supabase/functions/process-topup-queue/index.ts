
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno";

// Configure Supabase client with the service role key
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

// Set up supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Process topup queue function started");

    // Get pending topup requests
    const { data: pendingRequests, error: fetchError } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd")
      .eq("status", "pending")
      .limit(10); // Process in batches

    if (fetchError) {
      console.error("Error fetching pending topups:", fetchError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending topup requests" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log("No pending topup requests found");
      return new Response(
        JSON.stringify({ message: "No pending topup requests" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingRequests.length} pending topup requests`);

    // Process each request
    const results = await Promise.all(
      pendingRequests.map(async (request) => {
        try {
          // Update status to processing
          await supabase
            .from("topup_queue")
            .update({ status: "processing" })
            .eq("id", request.id);

          // Get user email using our new database function
          const { data: userEmailData, error: userEmailError } = await supabase.rpc(
            "get_user_email_by_id", 
            { user_id_param: request.user_id }
          );
          
          if (userEmailError || !userEmailData) {
            console.error(`User email not found for ID: ${request.user_id}`, userEmailError);
            await updateRequestStatus(request.id, "failed", "User email not found");
            return { id: request.id, status: "failed", error: "User email not found" };
          }
          
          const userEmail = userEmailData;

          // Get or create stripe customer
          let stripeCustomerId = await getStripeCustomerId(request.user_id, userEmail);
          if (!stripeCustomerId) {
            console.error(`Failed to get/create Stripe customer for user: ${request.user_id}`);
            await updateRequestStatus(request.id, "failed", "Could not create Stripe customer");
            return { id: request.id, status: "failed", error: "Stripe customer creation failed" };
          }

          // Look up the credit product
          const { data: creditProduct, error: productError } = await supabase
            .from("stripe_products")
            .select("price_id")
            .eq("active", true)
            .eq("type", "credit")
            .single();

          if (productError || !creditProduct) {
            console.error("No active credit product found");
            await updateRequestStatus(request.id, "failed", "Credit product not found");
            return { id: request.id, status: "failed", error: "Credit product not found" };
          }

          // Create checkout session
          const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [
              {
                price: creditProduct.price_id,
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: `${req.headers.get("origin") || SUPABASE_URL}/payment-return?success=true&topup=true`,
            cancel_url: `${req.headers.get("origin") || SUPABASE_URL}/dashboard?topup=cancelled`,
            metadata: {
              user_id: request.user_id,
              topup_request_id: request.id,
              amount_usd: "100.00",  // Updated to $100
              auto_topup: "true"
            },
          });

          // Update request with session information
          await supabase
            .from("topup_queue")
            .update({
              status: "checkout_created",
              processed_at: new Date().toISOString(),
            })
            .eq("id", request.id);

          // Return success result
          return {
            id: request.id,
            status: "checkout_created",
            checkout_url: session.url,
          };
        } catch (err) {
          console.error(`Error processing request ${request.id}:`, err);
          await updateRequestStatus(request.id, "failed", err.message);
          return { id: request.id, status: "failed", error: err.message };
        }
      })
    );

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Process topup function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to update request status
async function updateRequestStatus(id: string, status: string, errorMessage?: string) {
  const updates: any = {
    status,
    processed_at: new Date().toISOString(),
  };
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }
  
  return await supabase
    .from("topup_queue")
    .update(updates)
    .eq("id", id);
}

// Helper to get or create stripe customer
async function getStripeCustomerId(userId: string, email: string) {
  // First, check if user already has a stripe_customer_id in credit_transactions
  const { data: stripeCustomerId, error: customerIdError } = await supabase.rpc(
    "get_stripe_customer_id_for_user", 
    { user_id_param: userId }
  );
  
  if (stripeCustomerId && !customerIdError) {
    console.log(`Found existing Stripe customer ID in credit_transactions: ${stripeCustomerId}`);
    return stripeCustomerId;
  }

  // If not found in our DB, check if customer exists in Stripe by email
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      console.log(`Found existing customer in Stripe: ${customerId}`);
      
      // Record this customer ID in credit_transactions for future reference
      await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          email: email,
          stripe_customer_id: customerId,
          type: "link",
          description: "Linked existing Stripe customer",
          amount_usd: 0,
        });
      
      return customerId;
    }
  } catch (stripeErr) {
    console.error("Error checking Stripe customers:", stripeErr);
  }

  // Create a new customer if none was found
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        user_id: userId,
      },
    });
    
    console.log(`Created new Stripe customer: ${customer.id}`);
    
    // Save customer id in credit_transactions
    await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        email: email,
        stripe_customer_id: customer.id,
        type: "create",
        description: "Created new Stripe customer",
        amount_usd: 0,
      });

    return customer.id;
  } catch (err) {
    console.error("Failed to create Stripe customer:", err);
    return null;
  }
}
