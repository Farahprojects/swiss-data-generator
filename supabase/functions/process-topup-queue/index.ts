
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

    // Get pending topup requests and failed requests that could be retried
    // We don't use a "processing" status anymore to avoid stuck jobs
    const { data: requestsToProcess, error: fetchError } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd, status, error_message, retry_count, max_retries, last_retry_at")
      .or("status.eq.pending,and(status.eq.failed,error_message.not.ilike.%customer%)")
      .lt("retry_count", 3) // Only process if under max retries
      .order("retry_count", { ascending: true }) // Process lower retry counts first
      .limit(10); // Process in batches

    if (fetchError) {
      console.error("Error fetching requests to process:", fetchError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch topup requests" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requestsToProcess || requestsToProcess.length === 0) {
      console.log("No pending or retriable failed topup requests found");
      return new Response(
        JSON.stringify({ message: "No requests to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${requestsToProcess.length} topup requests to process`);

    // Process each request
    const results = await Promise.all(
      requestsToProcess.map(async (request) => {
        try {
          // Update retry count and last retry timestamp, but keep status as is
          // This avoids the job getting "stuck" in a processing state
          await supabase
            .from("topup_queue")
            .update({ 
              retry_count: request.retry_count + 1,
              last_retry_at: new Date().toISOString()
            })
            .eq("id", request.id);

          console.log(`Processing topup request ${request.id} (attempt ${request.retry_count + 1}/${request.max_retries})`);

          // Get user email using our database function
          const { data: userEmailData, error: userEmailError } = await supabase.rpc(
            "get_user_email_by_id", 
            { user_id_param: request.user_id }
          );
          
          if (userEmailError || !userEmailData) {
            const errorMessage = `User email not found for ID: ${request.user_id}`;
            console.error(errorMessage, userEmailError);
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { id: request.id, status: "failed", error: errorMessage, retry: request.retry_count + 1 };
          }
          
          const userEmail = userEmailData;
          console.log(`Found email for user ${request.user_id}: ${userEmail}`);

          // Get or create stripe customer
          let stripeCustomerId = await getStripeCustomerId(request.user_id, userEmail);
          if (!stripeCustomerId) {
            const errorMessage = `Failed to get/create Stripe customer for user: ${request.user_id}`;
            console.error(errorMessage);
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { 
              id: request.id, 
              status: "failed", 
              error: errorMessage, 
              retry: request.retry_count + 1 
            };
          }

          console.log(`Using Stripe customer ID: ${stripeCustomerId}`);

          // Look up the credit product
          const { data: creditProduct, error: productError } = await supabase
            .from("stripe_products")
            .select("price_id")
            .eq("active", true)
            .eq("type", "credit")
            .single();

          if (productError || !creditProduct) {
            const errorMessage = "Credit product not found";
            console.error(errorMessage);
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { 
              id: request.id, 
              status: "failed", 
              error: errorMessage, 
              retry: request.retry_count + 1 
            };
          }

          console.log(`Using credit product with price ID: ${creditProduct.price_id}`);

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
              amount_usd: "100.00",  // $100 topup amount
              auto_topup: "true"
            },
          });

          console.log(`Created checkout session: ${session.id} with URL: ${session.url}`);

          // Update request with session information - direct completion
          await supabase
            .from("topup_queue")
            .update({
              status: "checkout_created",
              processed_at: new Date().toISOString(),
              error_message: null, // Clear any previous error message
            })
            .eq("id", request.id);

          // Return success result
          return {
            id: request.id,
            status: "checkout_created",
            checkout_url: session.url,
            retry: request.retry_count,
          };
        } catch (err) {
          console.error(`Error processing request ${request.id} (attempt ${request.retry_count + 1}/${request.max_retries}):`, err);
          const errorMessage = err.message || "Unknown error occurred";
          
          // Always persist the latest error message with every failure
          await updateRequestStatus(
            request.id, 
            request.retry_count + 1 >= request.max_retries ? "max_retries_reached" : "failed", 
            errorMessage
          );
          
          return { 
            id: request.id, 
            status: request.retry_count + 1 >= request.max_retries ? "max_retries_reached" : "failed", 
            error: errorMessage,
            retry: request.retry_count + 1
          };
        }
      })
    );

    console.log("Processing complete. Results:", JSON.stringify(results, null, 2));
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
  
  console.log(`Updating request ${id} status to: ${status}${errorMessage ? ` (Error: ${errorMessage})` : ''}`);
  
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
