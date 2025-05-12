/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler
   Purpose: Verify Stripe HMAC, store every event once, update user credits
   Runtime: Deno Deploy / Supabase Edge
 * ========================================================================== */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ──────────────── ENV ──────────────── */

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

for (const key of REQUIRED_ENV) {
  if (!Deno.env.get(key)) throw new Error(`Missing env: ${key}`);
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ──────────────── CORS ─────────────── */

const CORS = {
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
  const { data, error } = await supabase
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
    )
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

async function markEvent(id: string, vals: Record<string, unknown>) {
  await supabase.from("stripe_webhook_events").update(vals)
    .eq("stripe_event_id", id);
}

/* ───────── Credit & back-fill helper ───────── */

async function creditUser(
  userId: string,
  usd: number,
  stripePid: string,
  pmId: string | null,
  customerId: string | null,
) {
  const { error } = await supabase.rpc("add_user_credits", {
    _user_id: userId,
    _amount_usd: usd,
    _type: "topup",
    _description: "Stripe auto-top-up",
    _stripe_pid: stripePid,
  });
  if (error) throw error;

  const { data } = await supabase
    .from("credit_transactions")
    .select("id, stripe_payment_method_id, stripe_customer_id")
    .eq("stripe_pid", stripePid)
    .eq("user_id", userId)
    .order("ts", { ascending: false })
    .limit(1);

  if (data?.length) {
    await supabase.from("credit_transactions").update({
      stripe_payment_method_id: pmId ?? data[0].stripe_payment_method_id,
      stripe_customer_id: customerId ?? data[0].stripe_customer_id,
    }).eq("id", data[0].id);
  }
}

/* ───────── Save PM details (setup mode) ───────── */

async function savePaymentMethodDetails(userId: string, si: any) {
  const pm = await stripe.paymentMethods.retrieve(si.payment_method);
  if (!pm) return;
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "setup",
    amount_usd: 0,
    description: "Payment method setup",
    stripe_payment_method_id: pm.id,
    stripe_customer_id: pm.customer,
    card_brand: pm.card?.brand ?? "unknown",
    card_last4: pm.card?.last4 ?? "****",
    payment_method_type: pm.type,
  });
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const raw = await req.text().catch(() => "");
  const sig = req.headers.get("stripe-signature") ?? "";
  try {
    await verifyStripeSignature(
      raw,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    return new Response("Bad signature", { status: 400, headers: CORS });
  }

  const evt = JSON.parse(raw);
  try {
    const fresh = await upsertEvent(evt);
    if (!fresh) return new Response("already processed", { status: 200, headers: CORS });
  } catch {
    return new Response("DB error", { status: 500, headers: CORS });
  }

  try {
    switch (evt.type) {
      /* ───── payment_intent.succeeded ───── */
      case "payment_intent.succeeded": {
        const pi = evt.data.object;
        const userId = pi.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");

        /* ✅ mark top-up queue row completed */
        if (pi.metadata?.topup_request_id) {
          await supabase.from("topup_queue").update({
            status: "completed",
            processed_at: new Date().toISOString(),
            error_message: null,
          }).eq("id", pi.metadata.topup_request_id);
        }

        await creditUser(
          userId,
          pi.amount / 100,
          pi.id,
          pi.payment_method,
          pi.customer,
        );
        break;
      }

      /* ───── checkout.session.completed ───── */
      case "checkout.session.completed": {
        const cs = evt.data.object;
        const userId = cs.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");

        if (cs.mode === "payment" && cs.payment_intent) {
          if (cs.metadata?.topup_request_id) {
            await supabase.from("topup_queue").update({
              status: "completed",
              processed_at: new Date().toISOString(),
              error_message: null,
            }).eq("id", cs.metadata.topup_request_id);
          }

          const pi = await stripe.paymentIntents.retrieve(cs.payment_intent);
          await creditUser(
            userId,
            pi.amount / 100,
            pi.id,
            pi.payment_method,
            pi.customer,
          );
        } else if (cs.mode === "setup" && cs.setup_intent) {
          const si = await stripe.setupIntents.retrieve(cs.setup_intent);
          await savePaymentMethodDetails(userId, si);
        }
        break;
      }

      /* ───── setup_intent.succeeded ───── */
      case "setup_intent.succeeded": {
        const si = evt.data.object;
        let userId: string | null = si.metadata?.user_id ?? null;
        const pmId = si.payment_method;
        const customerId = si.customer;

        let { data } = await supabase
          .from("credit_transactions")
          .select("id, user_id, stripe_payment_method_id")
          .eq("stripe_customer_id", customerId)
          .order("ts", { ascending: false })
          .limit(1);

        let txn = data?.[0];

        if (!txn && userId) {
          ({ data } = await supabase
            .from("credit_transactions")
            .select("id, stripe_payment_method_id")
            .eq("user_id", userId)
            .order("ts", { ascending: false })
            .limit(1));
          txn = data?.[0];
        }

        if (txn && !txn.stripe_payment_method_id) {
          await supabase.from("credit_transactions").update({
            stripe_payment_method_id: pmId,
          }).eq("id", txn.id);
        } else if (!txn && userId) {
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_payment_method_id: pmId,
            type: "card_setup",
            description: "Saved payment method via setup_intent",
            amount_usd: 0,
          });
        }
        break;
      }

      default:
        /* ignore other types */
    }

    await markEvent(evt.id, {
      processed: true,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    await markEvent(evt.id, { processing_error: String(err) });
    return new Response("handler error", { status: 500, headers: CORS });
  }

  return new Response("ok", { status: 200, headers: CORS });
});
