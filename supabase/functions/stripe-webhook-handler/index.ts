/* ======================================================================= *
   Supabase Edge Function – Stripe Webhook Handler (detail-rich version)
 * ======================================================================= */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe    from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ───── Env guard ───── */
const required = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
for (const k of required) if (!Deno.env.get(k)) throw new Error(`Missing env ${k}`);

const STRIPE_SECRET_KEY         = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET     = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/* ───── Clients ───── */
const stripe   = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ───── CORS (for dashboard testing only; Stripe itself doesn’t care) ───── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/* ───── Secure compare helper ───── */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ───── HMAC verification (Web Crypto) ───── */
async function verifyStripeSignature(
  raw: string,
  header: string,
  secret: string,
  tolerance = 300,
) {
  const parts = header.split(",").reduce<Record<string,string>>((acc, p) => {
    const [k, v] = p.split("="); acc[k] = v; return acc;
  }, {});
  const ts = parts.t;
  const sigs = parts.v1 ? parts.v1.split(" ") : [];
  if (!ts || !sigs.length) throw new Error("Bad Stripe-Signature");

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > tolerance) throw new Error("Signature timestamp out of range");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}.${raw}`));
  const expected = Array.from(new Uint8Array(mac)).map(b=>b.toString(16).padStart(2,"0")).join("");

  if (!sigs.some((s)=>secureCompare(s, expected))) throw new Error("HMAC mismatch");
}

/* ───── Event storage helpers ───── */
async function upsertEvent(evt: any): Promise<boolean> {
  const { error, data } = await supabase.from("stripe_webhook_events")
    .insert({
      stripe_event_id:  evt.id,
      stripe_event_type:evt.type,
      stripe_kind:      evt.type?.split(".")[0] ?? "unknown",
      stripe_customer_id: evt.data?.object?.customer ?? null,
      payload: evt,
      processed: false,
    }, { ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return data.length > 0;
}
async function markEvent(id: string, values: Record<string,unknown>) {
  await supabase.from("stripe_webhook_events").update(values).eq("stripe_event_id", id);
}

/* ───── Extract full payment + customer info ───── */
function getPaymentDetails(pi: Stripe.PaymentIntent): Record<string, any> {
  /* `pi` was fetched with expand → so `pi.payment_method` and `pi.customer`
     are full objects, not just IDs. */
  const pm = pi.payment_method as Stripe.PaymentMethod | undefined;
  const cust = pi.customer as Stripe.Customer | undefined;
  const charge = (pi.latest_charge as Stripe.Charge | undefined) ?? (pi.charges?.data?.[0] as Stripe.Charge | undefined);
  const billing = charge?.billing_details;

  return {
    stripe_pid:      pi.id,
    amount_usd:      (pi.amount_received ?? pi.amount) / 100,
    payment_status:  pi.status,

    /* Customer-level (prefer customer object, fallback to billing_details) */
    email:           cust?.email            ?? billing?.email            ?? null,
    full_name:       cust?.name             ?? billing?.name             ?? null,
    stripe_customer_id: typeof pi.customer === "string" ? pi.customer : cust?.id ?? null,

    /* Address (again: prefer customer) */
    country:         cust?.address?.country ?? billing?.address?.country ?? null,
    billing_address_line1: cust?.address?.line1 ?? billing?.address?.line1 ?? null,
    billing_address_line2: cust?.address?.line2 ?? billing?.address?.line2 ?? null,
    city:            cust?.address?.city    ?? billing?.address?.city    ?? null,
    state:           cust?.address?.state   ?? billing?.address?.state   ?? null,
    postal_code:     cust?.address?.postal_code ?? billing?.address?.postal_code ?? null,

    /* Card / PM */
    payment_method_type: pm?.type ?? null,
    card_brand:       pm?.card?.brand ?? charge?.payment_method_details?.card?.brand ?? null,
    card_last4:       pm?.card?.last4 ?? charge?.payment_method_details?.card?.last4 ?? null,
    card_country:     pm?.card?.country ?? null,

    /* Invoice (if any) */
    stripe_invoice_id: pi.invoice ?? null,
  };
}

/* ───── Business op: add credit + store details on credit_transactions ── */
async function creditUser(
  userId: string,
  details: Record<string, any>,
) {
  /* 1. Call your Postgres function to credit the user */
  const { error } = await supabase.rpc("add_user_credits", {
    _user_id:    userId,
    _amount_usd: details.amount_usd,
    _type:       "topup",
    _description:"Stripe auto-top-up",
    _stripe_pid: details.stripe_pid,
  });
  if (error) throw error;

  /* 2. Enrich the resulting credit_transactions row */
  const { error: up } = await supabase.from("credit_transactions")
    .update(details)
    .eq("stripe_pid", details.stripe_pid);
  if (up) console.error("⚠️ could not update credit_transactions:", up.message);
}

/* ───── Main HTTP handler ───── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const raw = await req.text().catch(()=>null);
  if (!raw) return new Response("Bad body", { status: 400, headers: CORS });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("No signature", { status: 400, headers: CORS });

  try {
    await verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("❌ Signature:", e.message);
    return new Response("Bad sig", { status: 400, headers: CORS });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400, headers: CORS }); }

  /* Idempotent insert */
  try { if (!(await upsertEvent(evt))) return new Response("dup", { status: 200, headers: CORS }); }
  catch (e) { console.error("DB insert err", e); return new Response("DB error", { status: 500, headers: CORS }); }

  /* ================ HANDLE EVENTS ================ */
  try {
    switch (evt.type) {
      case "payment_intent.succeeded": {
        const piId  = evt.data.object.id as string;

        /* Re-fetch with expansions so we have full PM+customer info */
        const pi = await stripe.paymentIntents.retrieve(piId, {
          expand: [
            "payment_method",
            "customer",
            "latest_charge.payment_method_details",
            "latest_charge.billing_details",
          ],
        });

        const userId = (pi.metadata?.user_id ?? null) as string | null;
        if (!userId) throw new Error("metadata.user_id missing");

        const details = getPaymentDetails(pi);
        await creditUser(userId, details);
        await markEvent(evt.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }

      case "checkout.session.completed": {
        const session = evt.data.object;
        const userId  = session.metadata?.user_id as string | undefined;
        if (!userId) throw new Error("metadata.user_id missing");
        if (!session.payment_intent) throw new Error("payment_intent id missing");

        const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
          expand: [
            "payment_method",
            "customer",
            "latest_charge.payment_method_details",
            "latest_charge.billing_details",
          ],
        });

        if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
          throw new Error(`PaymentIntent ${pi.id} bad status ${pi.status}`);
        }

        const details = getPaymentDetails(pi);
        await creditUser(userId, details);
        await markEvent(evt.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }

      default:
        console.info("Ignoring", evt.type);
        break;
    }
  } catch (err) {
    console.error("❌ Handler:", err.message);
    await markEvent(evt.id, { processing_error: err.message });
    return new Response("processing error", { status: 500, headers: CORS });
  }

  return new Response("ok", { status: 200, headers: CORS });
});
