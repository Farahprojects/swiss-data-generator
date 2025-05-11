
// Refactored cron logic for Supabase Edge Function (top-up queue processor)
// Assumes: 1-minute cron schedule, no email lookups, Stripe customer based on user_id only

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

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
    console.log("Starting topup queue processor");

    // First, let's check if we have valid statuses in our database
    const { data: validStatuses, error: statusError } = await supabase
      .from("topup_queue")
      .select("status")
      .limit(1);
    
    if (statusError) {
      console.error("Error checking valid statuses:", statusError);
    } else {
      console.log("Existing database statuses sample:", validStatuses);
    }

    const { data: requestsToProcess, error: fetchError } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd, status, error_message, retry_count, max_retries, last_retry_at")
      .or("status.eq.pending,status.eq.failed")
      .lt("retry_count", 3)
      .order("retry_count", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending requests:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch pending requests", details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!requestsToProcess || requestsToProcess.length === 0) {
      console.log("No pending requests to process");
      return new Response(JSON.stringify({ message: "No requests to process." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${requestsToProcess.length} pending requests to process`);

    const results = await Promise.all(
      requestsToProcess.map(async (request) => {
        try {
          console.log(`Processing request ${request.id}, retry ${request.retry_count + 1}`);

          // Update retry count and timestamp first - using a safer approach
          const { error: updateError } = await supabase.from("topup_queue").update({
            retry_count: request.retry_count + 1,
            last_retry_at: new Date().toISOString(),
          }).eq("id", request.id);

          if (updateError) {
            console.error(`Failed to update retry count for ${request.id}:`, updateError);
          }

          // Try to get Stripe customer ID for this user
          let stripeCustomerId;
          
          try {
            // First attempt to get from RPC if it exists
            const { data, error: lookupError } = await supabase.rpc(
              "get_stripe_customer_id_for_user",
              { user_id_param: request.user_id }
            );
            
            if (data && !lookupError) {
              stripeCustomerId = data;
            } else if (lookupError) {
              console.warn(`RPC error for ${request.id}:`, lookupError);
              
              // Fallback: try to get customer ID from credit_transactions table
              const { data: txnData } = await supabase
                .from("credit_transactions")
                .select("stripe_customer_id")
                .eq("user_id", request.user_id)
                .not("stripe_customer_id", "is", null)
                .order("ts", { ascending: false })
                .limit(1);
                
              if (txnData && txnData.length > 0 && txnData[0].stripe_customer_id) {
                stripeCustomerId = txnData[0].stripe_customer_id;
              }
            }
          } catch (lookupErr) {
            console.error(`Error looking up Stripe customer ID for ${request.id}:`, lookupErr);
          }

          if (!stripeCustomerId) {
            const errorMessage = "No Stripe customer ID found for user.";
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { id: request.id, status: "failed", error: errorMessage };
          }

          // Get the active credit product to use
          const { data: creditProduct, error: productError } = await supabase
            .from("stripe_products")
            .select("price_id, amount_usd")
            .eq("active", true)
            .eq("type", "credit")
            .single();

          if (!creditProduct || productError) {
            let errorMessage = "Credit product not found in database.";
            if (productError) {
              console.error(`Error fetching credit product for ${request.id}:`, productError);
              errorMessage += " Database error: " + productError.message;
            } else {
              console.error(`No active credit product found for ${request.id}`);
            }
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { id: request.id, status: "failed", error: errorMessage };
          }

          console.log(`Creating checkout session for ${request.id} with price ${creditProduct.price_id} ($${creditProduct.amount_usd})`);
          
          // Create Stripe checkout session
          const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [{ price: creditProduct.price_id, quantity: 1 }],
            mode: "payment",
            success_url: `${SUPABASE_URL}/payment-return?success=true&topup=true`,
            cancel_url: `${SUPABASE_URL}/dashboard?topup=cancelled`,
            metadata: {
              user_id: request.user_id,
              topup_request_id: request.id,
              amount_usd: creditProduct.amount_usd.toFixed(2),
              auto_topup: "true",
            },
          });

          // Update request processed_at and error_message but NOT status
          // The webhook will update the status to "completed" when payment is confirmed
          await supabase.from("topup_queue").update({
            processed_at: new Date().toISOString(),
            error_message: "Checkout session created successfully: " + session.id
          }).eq("id", request.id);

          console.log(`Successfully created checkout session for ${request.id}: ${session.id}`);
          return { id: request.id, checkout_session_id: session.id, checkout_url: session.url };
        } catch (err) {
          const errorMessage = err.message || "Unknown error occurred";
          console.error(`Error processing request ${request.id}:`, errorMessage);
          
          // If at max retries, mark as failed
          const status = request.retry_count + 1 >= request.max_retries ? "failed" : "failed";
          await updateRequestStatus(request.id, status, errorMessage);
          return { id: request.id, status, error: errorMessage };
        }
      })
    );

    console.log(`Processed ${results.length} requests`);
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error in topup queue processor:", e);
    return new Response(JSON.stringify({ error: "Unexpected error", details: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function updateRequestStatus(id: string, status: string, errorMessage?: string) {
  const updates: any = {
    status,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) updates.error_message = errorMessage;
  
  const { error } = await supabase.from("topup_queue").update(updates).eq("id", id);
  if (error) {
    console.error(`Failed to update status for request ${id}:`, error);
  }
}
