
/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (card-save only edition)
   Purpose : 1) Verify Stripe HMAC
             2) Record every event once (stripe_webhook_events)
             3) Upsert the user's saved card in public.payment_method
   Runtime : Supabase Edge / Deno Deploy
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/*  ➜ pin npm imports to the same std version to avoid runMicrotasks crash  */
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/* ──────────────── ENV ─────────────── */

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

for (const k of REQUIRED_ENV) {
  if (!Deno.env.get(k)) throw new Error(`Missing env: ${k}`);
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ──────────────── CORS ─────────────── */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/* ───────── Signature verify ─────────── */

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

  const ts = parts.t;
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

/* ───────── Event bookkeeping ────────── */

async function upsertEvent(evt: any) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: evt.type.split(".")[0],
        stripe_customer_id:
          evt.data?.object?.customer ?? evt.data?.object?.customer_id ?? null,
        payload: evt,
        processed: false,
      },
      { ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") throw error; // ignore dup key
}

async function markEventDone(evtId: string, err?: string) {
  await supabase.from("stripe_webhook_events")
    .update({
      processed: !err,
      processed_at: new Date().toISOString(),
      processing_error: err ?? null,
    })
    .eq("stripe_event_id", evtId);
}




/* ───────── Save / Update Payment-Method ───────── */
async function saveCard(pm: Stripe.PaymentMethod, userId: string) {
  const data = {
    user_id:                userId,
    stripe_customer_id:     pm.customer as string | null,
    stripe_payment_method_id: pm.id,
    payment_method_type:    pm.type,
    payment_status:         "active",
    email:                  pm.billing_details?.email ?? null,
    card_brand:             pm.card?.brand ?? null,
    card_last4:             pm.card?.last4 ?? null,
    exp_month:              pm.card?.exp_month ?? null,
    exp_year:               pm.card?.exp_year ?? null,
    fingerprint:            pm.card?.fingerprint ?? null,
    billing_name:           pm.billing_details?.name ?? null,
    billing_address_line1:  pm.billing_details?.address?.line1 ?? null,
    billing_address_line2:  pm.billing_details?.address?.line2 ?? null,
    city:                   pm.billing_details?.address?.city ?? null,
    state:                  pm.billing_details?.address?.state ?? null,
    postal_code:            pm.billing_details?.address?.postal_code ?? null,
    country:                pm.billing_details?.address?.country ?? null,
    is_default:             false,
  };

  const { error } = await supabase
    .from("payment_method")
    .upsert(data, { onConflict: "stripe_payment_method_id" });

  if (error) {
    console.error("Supabase upsert error", error);
    throw error;
  }
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const raw = await req.text().catch(() => "");
  const sig = req.headers.get("stripe-signature") ?? "";

  /* 1️⃣  Verify HMAC */
  try {
    await verifyStripeSignature(
      raw,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch {
    return new Response("Bad signature", { status: 400, headers: CORS_HEADERS });
  }

  const evt = JSON.parse(raw);

  /* 2️⃣  Record event for idempotency / audit */
  try {
    await upsertEvent(evt);
  } catch {
    return new Response("DB error", { status: 500, headers: CORS_HEADERS });
  }

  /* 3️⃣  Handle only card-save events */
  try {
    switch (evt.type) {
      case "setup_intent.succeeded": {
        const si = evt.data.object as Stripe.SetupIntent;
        console.log(`Setup session completed: ${si.id}`);

        const userId = si.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");

        const pm = await stripe.paymentMethods.retrieve(
          si.payment_method as string,
        );
        await saveCard(pm, userId);
        break;
      }

      case "payment_method.attached": {
        const pmEvt = evt.data.object as Stripe.PaymentMethod;
        console.log(
          `Payment method attached to customer ${pmEvt.customer}: ${pmEvt.id}`,
        );

        let userId = pmEvt.metadata?.user_id as string | undefined;

        /* fallback → grab customer metadata */
        if (!userId && pmEvt.customer) {
          const cust = await stripe.customers.retrieve(pmEvt.customer as string);
          userId = (cust as Stripe.Customer).metadata?.user_id;
        }

        if (!userId) {
          console.warn("No user_id metadata; skipping saveCard");
          break;
        }

        await saveCard(pmEvt, userId);
        break;
      }

      /* ignore all other event types */
    }

    await markEventDone(evt.id);
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error(`Error saving payment method details: ${err}`);
    await markEventDone(evt.id, String(err));
    return new Response("handler error", { status: 500, headers: CORS_HEADERS });
  }
});
