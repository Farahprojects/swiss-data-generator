/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (cards + top-ups, v2)
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/* pin third-party libs to same std */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/* ───────── ENV ───────── */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ───────── CORS ───────── */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

/* ───────── utils ───────── */

function nowISO() { return new Date().toISOString(); }

/* signature-verify identical to previous version – omitted for brevity */

/* ───────── Event bookkeeping ───────── */

async function recordEvent(evt: any) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: evt.type.split(".")[0],
        stripe_customer_id: evt.data?.object?.customer ?? null,
        payload: evt,
        processed: false,
      },
      { ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") throw error;
}

async function finalizeEvent(id: string, ok: boolean, err?: string) {
  await supabase.from("stripe_webhook_events")
    .update({
      processed: ok,
      processed_at: nowISO(),
      processing_error: err ?? null,
    })
    .eq("stripe_event_id", id);
}

/* ───────── Payment-method helper ───────── */

async function saveCard(pm: Stripe.PaymentMethod, userId: string) {
  /** pull email (try customer metadata if missing) */
  let email = pm.billing_details?.email ?? null;
  if (!email && typeof pm.customer === "string") {
    const { email: custEmail } = await stripe.customers
      .retrieve(pm.customer) as Stripe.Customer;
    email = custEmail ?? null;
  }

  const row = {
    user_id:                 userId,
    ts:                      nowISO(),
    stripe_customer_id:      pm.customer as string | null,
    stripe_payment_method_id: pm.id,
    payment_method_type:     pm.type,
    payment_status:          "active",
    email,
    card_brand:              pm.card?.brand ?? null,
    card_last4:              pm.card?.last4 ?? null,
    exp_month:               pm.card?.exp_month ?? null,
    exp_year:                pm.card?.exp_year ?? null,
    fingerprint:             pm.card?.fingerprint ?? null,
    billing_name:            pm.billing_details?.name ?? null,
    billing_address_line1:   pm.billing_details?.address?.line1 ?? null,
    billing_address_line2:   pm.billing_details?.address?.line2 ?? null,
    city:                    pm.billing_details?.address?.city ?? null,
    state:                   pm.billing_details?.address?.state ?? null,
    postal_code:             pm.billing_details?.address?.postal_code ?? null,
    country:                 pm.billing_details?.address?.country ?? null,
    is_default:              false,
  };

  const { error } = await supabase
  .from("payment_method")
  .insert(row, { ignoreDuplicates: true });

  if (error) throw error;
}

/* ───────── Handlers ───────── */

async function handleSetupIntentSucceeded(evt: any) {
  const si = evt.data.object as Stripe.SetupIntent;
  const userId = si.metadata?.user_id;
  if (!userId) throw new Error("metadata.user_id missing");

  const pm = await stripe.paymentMethods.retrieve(si.payment_method as string);
  await saveCard(pm, userId);
}

async function handlePaymentMethodAttached(evt: any) {
  const pm = evt.data.object as Stripe.PaymentMethod;

  let userId = pm.metadata?.user_id as string | undefined;
  if (!userId && typeof pm.customer === "string") {
    const cust = await stripe.customers.retrieve(pm.customer);
    userId = (cust as Stripe.Customer).metadata?.user_id;
  }
  if (!userId) throw new Error("no user_id on payment_method.attached");

  await saveCard(pm, userId);
}

async function handlePiSucceeded(evt: any) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const userId = pi.metadata?.user_id;
  if (!userId) throw new Error("payment_intent.succeeded without user_id");

  const { error } = await supabase.from("topup_logs").insert({
    user_id: userId,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    status: "succeeded",
  });
  if (error) throw error;
}

async function handlePiFailed(evt: any) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const userId = pi.metadata?.user_id;
  if (!userId) throw new Error("payment_intent.payment_failed without user_id");

  const { error } = await supabase.from("topup_logs_failed").insert({
    user_id: userId,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    error_message: pi.last_payment_error?.message ?? "unknown",
  });
  if (error) throw error;
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const raw = await req.text().catch(() => "");
  const sig  = req.headers.get("stripe-signature") ?? "";

  /* verify */
  try {
    await verifyStripeSignature(raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    console.error("Bad signature", e);
    return new Response("bad sig", { status: 400, headers: CORS });
  }

  const evt = JSON.parse(raw);
  await recordEvent(evt);

  let ok = true;
  let errMsg: string | undefined;

  try {
    switch (evt.type) {
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(evt);     break;
      case "payment_method.attached":
        await handlePaymentMethodAttached(evt);    break;
      case "payment_intent.succeeded":
        await handlePiSucceeded(evt);              break;
      case "payment_intent.payment_failed":
        await handlePiFailed(evt);                 break;
      default: /* ignore */                        break;
    }
  } catch (err: any) {
    ok = false;
    errMsg = err.message ?? String(err);
    console.error(`Error processing ${evt.type}:`, errMsg);
  }

  await finalizeEvent(evt.id, ok, errMsg);

  /* ALWAYS return 200 so Stripe stops retrying.
     If ok = false you can re-queue the event later. */
  return new Response(ok ? "ok" : "recorded error", { status: 200, headers: CORS });
});
