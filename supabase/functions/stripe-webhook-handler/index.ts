
/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (cards + top-ups)
   Purpose : 1) Verify Stripe HMAC
             2) Deduplicate events  (stripe_webhook_events)
             3) Keep ONE saved-card row per user      (payment_method)
             4) Log credit top-ups & failures         (topup_logs / topup_logs_failed)
   Notes   : • "credited" column is NOT set here; DB trigger flips it to true
             • topup_logs row is UPSERT-ed on stripe_payment_intent_id
               → guarantees max-one row & avoids race duplicates
             • receipt_url fetched reliably (expand / charge fallback)
   Runtime : Supabase Edge / Deno Deploy
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/* ─────────────── ENV ─────────────── */

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

for (const k of REQUIRED_ENV)
  if (!Deno.env.get(k)) throw new Error(`Missing env: ${k}`);

const stripe  = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ─────────────── CORS ─────────────── */

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/* ───────── Signature verify ───────── */

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
) {
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=");
    acc[k] = v;
    return acc;
  }, {});
  const ts   = parts.t;
  const sigs = parts.v1?.split(" ") ?? [];
  if (!ts || !sigs.length) throw new Error("Malformed Stripe-Signature");
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
  if (!sigs.some((sig) => secureCompare(sig, expected))) {
    throw new Error("Signature mismatch");
  }
}

/* ───────── Event bookkeeping ───────── */

async function upsertEvent(evt: any) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id:   evt.id,
        stripe_event_type: evt.type,
        stripe_kind:       evt.type.split(".")[0],
        stripe_customer_id:
          evt.data?.object?.customer ?? evt.data?.object?.customer_id ?? null,
        payload:   evt,
        processed: false,
      },
      { ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") throw error; // allow duplicate-key noop
}

async function markEvent(evtId: string, err?: string) {
  await supabase.from("stripe_webhook_events")
    .update({
      processed: !err,
      processed_at: new Date().toISOString(),
      processing_error: err ?? null,
    })
    .eq("stripe_event_id", evtId);
}

/* ───────── Payment-method helper ───────── */

async function saveCard(pm: Stripe.PaymentMethod, userId: string) {
  /* pull email; fallback to customer */
  let email = pm.billing_details?.email ?? null;
  if (!email && typeof pm.customer === "string") {
    const cust = await stripe.customers.retrieve(pm.customer);
    email = (cust as Stripe.Customer).email ?? null;
  }

  const row = {
    user_id:                 userId,
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

/* ───────── Top-up helpers ───────── */

async function logTopupSuccess(userId: string, pi: Stripe.PaymentIntent) {
  /* extract receipt URL (inline ➔ fallback charge fetch) */
  let receiptUrl: string | null = pi.charges?.data?.[0]?.receipt_url ?? null;
  if (!receiptUrl && pi.latest_charge) {
    const charge = await stripe.charges.retrieve(
      pi.latest_charge as string,
    );
    receiptUrl = (charge as Stripe.Charge).receipt_url ?? null;
  }

  const payload = {
    user_id: userId,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    status: "completed",
    receipt_url: receiptUrl,
    // credited left to default false; DB trigger flips it
  };

  /* atomic upsert to avoid race duplicates */
  const { error } = await supabase
    .from("topup_logs")
    .upsert(payload, { onConflict: "stripe_payment_intent_id", returning: "minimal" });
  if (error) throw error;

  /* optional queue update (unchanged) */
  const topupRequestId = pi.metadata?.topup_request_id;
  if (topupRequestId) {
    await supabase.from("topup_queue")
      .update({ status: "completed" })
      .eq("id", topupRequestId)
      .eq("user_id", userId);
  }
}

async function logTopupFailure(userId: string, pi: Stripe.PaymentIntent) {
  const { error } = await supabase.from("topup_logs_failed").insert({
    user_id: userId,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    message: pi.last_payment_error?.message ?? "Unknown failure",
  });
  if (error) throw error;
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  /* raw body first */
  const raw = await req.text().catch(() => "");
  const sig = req.headers.get("stripe-signature") ?? "";

  /* 1️⃣  Verify signature */
  try {
    await verifyStripeSignature(raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Bad signature", { status: 400, headers: CORS });
  }

  const evt = JSON.parse(raw);

  /* 2️⃣  Deduplicate / audit */
  try {
    await upsertEvent(evt);
  } catch (err) {
    console.error("Error recording event:", err);
    return new Response("DB error", { status: 500, headers: CORS });
  }

  /* 3️⃣  Handler */
  try {
    switch (evt.type) {
      /* ── CARD SAVE ───────────────────────────── */
      case "setup_intent.succeeded": {
        const si = evt.data.object as Stripe.SetupIntent;
        const userId = si.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing in setup_intent");

        const pm = await stripe.paymentMethods.retrieve(si.payment_method as string);
        await saveCard(pm, userId);
        break;
      }

      case "payment_method.attached": {
        const pm = evt.data.object as Stripe.PaymentMethod;
        let userId = pm.metadata?.user_id as string | undefined;
        if (!userId && pm.customer) {
          const cust = await stripe.customers.retrieve(pm.customer as string);
          userId = (cust as Stripe.Customer).metadata?.user_id;
        }
        if (userId) await saveCard(pm, userId);
        break;
      }

      /* ── CREDIT TOP-UPS (single source of truth) ─────────── */
      case "payment_intent.succeeded": {
        const piRaw = evt.data.object as Stripe.PaymentIntent;
        const pi    = await stripe.paymentIntents.retrieve(
          piRaw.id,
          { expand: ["charges"] },
        );
        const userId = pi.metadata?.user_id;
        if (userId) await logTopupSuccess(userId, pi as Stripe.PaymentIntent);
        break;
      }

      /* charge.succeeded fires too: upsert prevents duplicates */
      case "charge.succeeded": {
        const ch = evt.data.object as Stripe.Charge;
        let userId = ch.metadata?.user_id as string | undefined;
        if (!userId && ch.customer) {
          const cust = await stripe.customers.retrieve(ch.customer as string);
          userId = (cust as Stripe.Customer).metadata?.user_id;
        }
        if (!userId) break;

        if (ch.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(
            ch.payment_intent as string,
            { expand: ["charges"] },
          );
          await logTopupSuccess(userId, pi as Stripe.PaymentIntent);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = evt.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata?.user_id;
        if (userId) await logTopupFailure(userId, pi);
        break;
      }

      /* ignore everything else */
    }

    await markEvent(evt.id);
    return new Response("ok", { status: 200, headers: CORS });
  } catch (err) {
    console.error("Handler error:", err);
    await markEvent(evt.id, String(err));
    return new Response("handler error", { status: 500, headers: CORS });
  }
});
