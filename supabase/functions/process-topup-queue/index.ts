
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting topup queue processor");

    const { data: requestsToProcess, error: fetchError } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd, status")
      .eq("status", "pending")
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
          console.log(`Processing request ${request.id}`);

          let stripeCustomerId;
          let stripePaymentMethodId;

          const { data: paymentData } = await supabase
            .from("payment_method")
            .select("stripe_customer_id, stripe_payment_method_id")
            .eq("user_id", request.user_id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (paymentData && paymentData.length > 0) {
            stripeCustomerId = paymentData[0].stripe_customer_id;
            stripePaymentMethodId = paymentData[0].stripe_payment_method_id;
          }

          if (!stripeCustomerId || !stripePaymentMethodId) {
            const errorMessage = "No Stripe customer ID or payment method found for user.";
            await updateRequestStatus(request.id, "failed", errorMessage);
            return { id: request.id, status: "failed", error: errorMessage };
          }

          // Convert dollars to cents for Stripe
          const amountCents = Math.round(request.amount_usd * 100);

          const intent = await stripe.paymentIntents.create({
            customer: stripeCustomerId,
            amount: amountCents,
            currency: "usd",
            payment_method: stripePaymentMethodId,
            off_session: true,
            confirm: true,
            metadata: {
              user_id: request.user_id,
              topup_request_id: request.id,
              auto_topup: "true"
            }
          });

          await supabase.from("topup_queue").update({
            processed_at: new Date().toISOString(),
            error_message: "Payment intent created successfully: " + intent.id
          }).eq("id", request.id);

          console.log(`Successfully created payment intent for ${request.id}: ${intent.id}`);
          return { id: request.id, payment_intent_id: intent.id, status: intent.status };
        } catch (err) {
          const errorMessage = err.message || "Unknown error occurred";
          console.error(`Error processing request ${request.id}:`, errorMessage);
          await updateRequestStatus(request.id, "failed", errorMessage);
          return { id: request.id, status: "failed", error: errorMessage };
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
