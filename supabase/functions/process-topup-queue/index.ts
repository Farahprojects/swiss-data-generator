// @ts-nocheck - Deno runtime, types checked at deployment
// Supabase Edge Function – top-up queue processor (1-minute cron)



/*  pin Stripe & Supabase to the SAME std version  */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* utility: update status row --------------------------------------------- */
async function updateRequestStatus(id: string, status: string, msg?: string) {
  const { error } = await supabase
    .from("topup_queue")
    .update({
      status,
      processed_at: new Date().toISOString(),
      message: msg ?? null,
    })
    .eq("id", id);
  if (error) console.error(`Failed to update request ${id}:`, error);
}

/* main ------------------------------------------------------------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    console.log("Top-up cron start");

    /* fetch up to 10 pending jobs */
    const { data: jobs, error: fetchErr } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd")
      .eq("status", "pending")
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!jobs?.length) {
      return new Response(JSON.stringify({ msg: "No requests" }), { status: 200, headers: CORS });
    }

    const results = await Promise.all(
      jobs.map(async (job) => {
        try {
          /* get latest active card */
          const { data: pmRow, error: pmErr } = await supabase
            .from("payment_method")  // Updated to use payment_method table
            .select("stripe_customer_id, stripe_payment_method_id")
            .eq("user_id", job.user_id)
            .eq("active", true)      // Only get active payment methods
            .maybeSingle();

          if (pmErr) throw pmErr;
          if (!pmRow?.stripe_customer_id || !pmRow?.stripe_payment_method_id) {
            const msg = "Missing Stripe customer or payment method";
            await updateRequestStatus(job.id, "failed", msg);
            return { id: job.id, status: "failed", error: msg };
          }

          const intent = await stripe.paymentIntents.create({
            customer: pmRow.stripe_customer_id,
            amount: Math.round(job.amount_usd * 100),
            currency: "usd",
            payment_method: pmRow.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            metadata: {
              user_id: job.user_id,
              topup_request_id: job.id,
              auto_topup: "true",
            },
          });

          await updateRequestStatus(job.id, "processing", `PI ${intent.id} created`);
          return { id: job.id, payment_intent_id: intent.id, status: intent.status };
        } catch (err: any) {
          const msg = err.message ?? "Unknown error";
          console.error(`Job ${job.id} failed:`, msg);
          await updateRequestStatus(job.id, "failed", msg);
          return { id: job.id, status: "failed", error: msg };
        }
      }),
    );

    console.log(`Processed ${results.length} top-ups`);
    return new Response(JSON.stringify({ results }), { status: 200, headers: CORS });
  } catch (err: any) {
    console.error("Top-up cron fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
