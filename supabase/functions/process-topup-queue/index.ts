// Supabase Edge Function – top-up queue processor
// Runs on a 1-minute cron, charges pending rows in public.topup_queue

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/*  pin Stripe & Supabase to the same std version  */
import Stripe from "https://esm.sh/stripe@13.2.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe   = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ───────── helper ───────── */
async function updateRequestStatus(id: string, status: string, msg?: string) {
  const { error } = await supabase.from("topup_queue").update({
    status,
    processed_at: new Date().toISOString(),
    error_message: msg ?? null,
  }).eq("id", id);
  if (error) console.error(`Failed to update request ${id}:`, error);
}

/* ───────── main handler ───────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    console.log("Top-up cron start");

    /* pull up to 10 pending rows */
    const { data: jobs, error: fetchErr } = await supabase
      .from("topup_queue")
      .select("id, user_id, amount_usd, status")
      .eq("status", "pending")
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!jobs?.length) return new Response(JSON.stringify({ msg: "No requests" }), { status: 200, headers: CORS });

    const results = await Promise.all(jobs.map(async (job) => {
      try {
        /* get latest saved card */
        const { data: pmRows, error: pmErr } = await supabase
          .from("payment_method")
          .select("stripe_customer_id, stripe_payment_method_id")
          .eq("user_id", job.user_id)
          .order("ts", { ascending: false })
          .limit(1);

        if (pmErr) throw pmErr;
        if (!pmRows?.length || !pmRows[0].stripe_customer_id || !pmRows[0].stripe_payment_method_id) {
          const msg = "Missing Stripe customer or payment method";
          await updateRequestStatus(job.id, "failed", msg);
          return { id: job.id, status: "failed", error: msg };
        }

        const { stripe_customer_id: customer, stripe_payment_method_id: payment_method } = pmRows[0];
        const amountCents = Math.round(job.amount_usd * 100);

        const intent = await stripe.paymentIntents.create({
          customer,
          amount: amountCents,
          currency: "usd",
          payment_method,
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
    }));

    console.log(`Processed ${results.length} top-ups`);
    return new Response(JSON.stringify({ results }), { status: 200, headers: CORS });
  } catch (err: any) {
    console.error("Top-up cron fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
