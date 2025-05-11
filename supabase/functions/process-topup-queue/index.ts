
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

serve(async () => {
  const { data: requestsToProcess, error: fetchError } = await supabase
    .from("topup_queue")
    .select("id, user_id, amount_usd, status, error_message, retry_count, max_retries, last_retry_at")
    .eq("status", "pending")
    .lt("retry_count", 3)
    .order("retry_count", { ascending: true })
    .limit(10);

  if (fetchError || !requestsToProcess || requestsToProcess.length === 0) {
    return new Response(JSON.stringify({ message: "No requests to process." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = await Promise.all(
    requestsToProcess.map(async (request) => {
      try {
        await supabase.from("topup_queue").update({
          retry_count: request.retry_count + 1,
          last_retry_at: new Date().toISOString(),
        }).eq("id", request.id);

        const { data: stripeCustomerId, error: lookupError } = await supabase.rpc(
          "get_stripe_customer_id_for_user",
          { user_id_param: request.user_id }
        );

        if (!stripeCustomerId || lookupError) {
          const errorMessage = "No Stripe customer ID found.";
          await updateRequestStatus(request.id, "failed", errorMessage);
          return { id: request.id, status: "failed", error: errorMessage };
        }

        const { data: creditProduct, error: productError } = await supabase
          .from("stripe_products")
          .select("price_id")
          .eq("active", true)
          .eq("type", "credit")
          .single();

        if (!creditProduct || productError) {
          const errorMessage = "Credit product not found.";
          await updateRequestStatus(request.id, "failed", errorMessage);
          return { id: request.id, status: "failed", error: errorMessage };
        }

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
            amount_usd: request.amount_usd.toFixed(2),
            auto_topup: "true",
          },
        });

        await supabase.from("topup_queue").update({
          status: "checkout_created",
          processed_at: new Date().toISOString(),
          error_message: null,
        }).eq("id", request.id);

        return { id: request.id, status: "checkout_created", checkout_url: session.url };
      } catch (err) {
        const errorMessage = err.message || "Unknown error occurred";
        await updateRequestStatus(
          request.id,
          request.retry_count + 1 >= request.max_retries ? "max_retries_reached" : "failed",
          errorMessage
        );
        return { id: request.id, status: "failed", error: errorMessage };
      }
    })
  );

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function updateRequestStatus(id: string, status: string, errorMessage?: string) {
  const updates: any = {
    status,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) updates.error_message = errorMessage;
  await supabase.from("topup_queue").update(updates).eq("id", id);
}
