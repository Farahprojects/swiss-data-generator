/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (cards + top‑ups)
   Runtime : Supabase Edge / Deno Deploy
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/* pin npm packages to the same std to avoid runMicrotasks crash */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/* ───────── ENV & clients ───────── */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
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

/* ───────── Helpers ───────── */

const nowISO = () => new Date().toISOString();

/* constant‑time string comparison */
function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* HMAC verification (no Stripe SDK needed) */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
) {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const ts = parts.t;
  const sigs = parts.v1?.split(" ") ?? [];
  if (!ts || !sigs.length) throw new Error("Malformed Stripe‑Signature");

  if (Math.abs(Date.now() / 1e3 - Number(ts)) > toleranceSec) {
    throw new Error("Timestamp outside tolerance");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ts}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(expectedBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!sigs.some((s) => secureCompare(s, expected))) {
    throw new Error("Signature mismatch");
  }
}

/* ───────── Bookkeeping (stripe_webhook_events) ───────── */

async function insertWebhookRow(evt: any) {
  return supabase
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
}

async function markProcessed(id: string, ok: boolean, err?: string) {
  await supabase.from("stripe_webhook_events")
    .update({
      processed: ok,
      processed_at: nowISO(),
      processing_error: err ?? null,
    })
    .eq("stripe_event_id", id);
}

/* ───────── Payment‑method upsert ───────── */

async function saveCard(pm: Stripe.PaymentMethod, userId: string) {
  let email = pm.billing_details?.email ?? null;
  if (!email && typeof pm.customer === "string") {
    const cust = await stripe.customers.retrieve(pm.customer);
    email = (cust as Stripe.Customer).email ?? null;
  }

  const row = {
    user_id: userId,
    ts: nowISO(),
    stripe_customer_id: pm.customer as string | null,
    stripe_payment_method_id: pm.id,
    payment_method_type: pm.type,
    payment_status: "active",
    email,
    card_brand: pm.card?.brand ?? null,
    card_last4: pm.card?.last4 ?? null,
    exp_month: pm.card?.exp_month ?? null,
    exp_year: pm.card?.exp_year ?? null,
    fingerprint: pm.card?.fingerprint ?? null,
    billing_name: pm.billing_details?.name ?? null,
    billing_address_line1: pm.billing_details?.address?.line1 ?? null,
    billing_address_line2: pm.billing_details?.address?.line2 ?? null,
    city: pm.billing_details?.address?.city ?? null,
    state: pm.billing_details?.address?.state ?? null,
    postal_code: pm.billing_details?.address?.postal_code ?? null,
    country: pm.billing_details?.address?.country ?? null,
    is_default: false,
  };

  const { error } = await supabase
    .from("payment_method")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

/* ───────── Top‑up log helpers ───────── */

const logTopupSuccess = async (uid: string, pi: Stripe.PaymentIntent) =>
  supabase.from("topup_logs").insert({
    user_id: uid,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    status: "succeeded",
  });

const logTopupFailure = async (uid: string, pi: Stripe.PaymentIntent) =>
  supabase.from("topup_logs_failed").insert({
    user_id: uid,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    error_message: pi.last_payment_error?.message ?? "unknown",
  });

/* ───────── Event‑specific handlers ───────── */

async function handleSetupIntentSucceeded(evt: any) {
  const si = evt.data.object as Stripe.SetupIntent;
  const uid = si.metadata?.user_id;
  if (!uid) throw new Error("setup_intent.missing_user_id");

  const pm = await stripe.paymentMethods.retrieve(si.payment_method as string);
  await saveCard(pm, uid);
}

async function handlePaymentMethodAttached(evt: any) {
  const pm = evt.data.object as Stripe.PaymentMethod;
  let uid = pm.metadata?.user_id as string | undefined;

  if (!uid && pm.customer) {
    const cust = await stripe.customers.retrieve(pm.customer as string);
    uid = (cust as Stripe.Customer).metadata?.user_id;
  }
  if (!uid) throw new Error("pm.attached.missing_user_id");

  await saveCard(pm, uid);
}

async function handlePiSucceeded(evt: any) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const uid = pi.metadata?.user_id;
  if (!uid) throw new Error("pi.succeeded.missing_user_id");
  const { error } = await logTopupSuccess(uid, pi);
  if (error) throw error;
}

async function handlePiFailed(evt: any) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const uid = pi.metadata?.user_id;
  if (!uid) throw new Error("pi.failed.missing_user_id");
  const { error } = await logTopupFailure(uid, pi);
  if (error) throw error;
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const raw = await req.text().catch(() => "");
  const sig = req.headers.get("stripe-signature") ?? "";

  /* verify signature */
  try {
    await verifyStripeSignature(raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    console.error("Bad signature:", e);
    return new Response("bad sig", { status: 400, headers: CORS });
  }

  const evt = JSON.parse(raw);

  /* try to insert bookkeeping row, but don't crash if it fails */
  let rowInserted = true;
  try {
    const { error } = await insertWebhookRow(evt);
    if (error && error.code !== "23505") throw error;
  } catch (e) {
    rowInserted = false;
    console.error("stripe_webhook_events insert failed:", e);
  }

  /* process event */
  let ok = true;
  let errMsg: string | undefined;
  try {
    switch (evt.type) {
      case "setup_intent.succeeded":      await handleSetupIntentSucceeded(evt); break;
      case "payment_method.attached":     await handlePaymentMethodAttached(evt); break;
      case "payment_intent.succeeded":    await handlePiSucceeded(evt);           break;
      case "payment_intent.payment_failed": await handlePiFailed(evt);            break;
      /* ignore others */
    }
  } catch (e: any) {
    ok = false;
    errMsg = e.message ?? String(e);
    console.error(`Handler error (${evt.type}):`, errMsg);
  }

  /* update bookkeeping row if we have one */
  if (rowInserted) {
    await markProcessed(evt.id, ok, errMsg);
  }

  /* always return 200 so Stripe stops retrying */
  return new Response(ok ? "ok" : "recorded error", { status: 200, headers: CORS });
});
