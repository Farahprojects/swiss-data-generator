
/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (cards + top-ups + services)
   Purpose : 1) Verify Stripe HMAC
             2) Deduplicate events              (stripe_webhook_events)
             3) Keep ONE saved‑card row/user    (payment_method)
             4) Log top‑ups & failures          (topup_logs / topup_logs_failed)
             5) Track service purchases         (service_purchases)
             6) Centralise card‑status handling (active/status_reason/changed)
   Notes   : • "credited" stays false here; DB trigger flips it
             • topup_logs is upserted on stripe_payment_intent_id (no duplicates)
             • service_purchases tracks coach service sales
             • receipt_url fetched via expand/charge‑fetch fallback
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

const stripe   = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
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

/* ───────── Coach resolution helper ───────── */

async function resolveCoachFromSlug(coachSlug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("coach_websites")
      .select("coach_id")
      .eq("site_slug", coachSlug)
      .single();
    
    if (error) {
      console.error(`Failed to resolve coach from slug ${coachSlug}:`, error);
      return null;
    }
    
    return data?.coach_id || null;
  } catch (error) {
    console.error(`Error resolving coach slug ${coachSlug}:`, error);
    return null;
  }
}

/* ───────── Service purchase helpers ───────── */

function calculatePlatformFee(amountCents: number): { platformFeeCents: number; coachPayoutCents: number } {
  // 5% platform fee (adjust as needed)
  const platformFeeCents = Math.floor(amountCents * 0.05);
  const coachPayoutCents = amountCents - platformFeeCents;
  return { platformFeeCents, coachPayoutCents };
}

async function logServicePurchase(pi: Stripe.PaymentIntent) {
  const reportData = pi.metadata;
  
  // Check if this is a service purchase (has purchase_type: 'service')
  if (reportData?.purchase_type !== 'service') {
    return; // Not a service purchase, skip
  }

  const coachSlug = reportData.coach_slug;
  if (!coachSlug) {
    console.error("Service purchase missing coach_slug in metadata");
    return;
  }

  console.log(`Processing service purchase for coach slug: ${coachSlug}`);

  // Resolve coach ID from slug
  const coachId = await resolveCoachFromSlug(coachSlug);
  if (!coachId) {
    console.error(`Failed to resolve coach ID for slug: ${coachSlug}`);
  }

  // Calculate platform fee and coach payout
  const { platformFeeCents, coachPayoutCents } = calculatePlatformFee(pi.amount);

  // Extract receipt URL
  let receiptUrl: string | null = pi.charges?.data?.[0]?.receipt_url ?? null;
  if (!receiptUrl && pi.latest_charge) {
    const charge = await stripe.charges.retrieve(pi.latest_charge as string);
    receiptUrl = (charge as Stripe.Charge).receipt_url ?? null;
  }

  // Get customer email
  let customerEmail = reportData.guest_email || 'guest@example.com';
  if (pi.customer && typeof pi.customer === 'string') {
    const customer = await stripe.customers.retrieve(pi.customer);
    if (!customer.deleted && customer.email) {
      customerEmail = customer.email;
    }
  }

  const purchaseData = {
    stripe_session_id: reportData.stripe_session_id || pi.id, // Use session ID from metadata or fallback to PI
    stripe_payment_intent_id: pi.id,
    coach_id: coachId,
    coach_slug: coachSlug,
    service_title: reportData.service_title || 'Service Purchase',
    service_description: reportData.service_description || null,
    service_price_original: reportData.service_price || 'Unknown',
    amount_cents: pi.amount,
    platform_fee_cents: platformFeeCents,
    coach_payout_cents: coachPayoutCents,
    customer_email: customerEmail,
    customer_name: reportData.customer_name || null,
    stripe_customer_id: typeof pi.customer === 'string' ? pi.customer : null,
    payment_status: 'completed',
    receipt_url: receiptUrl,
    purchase_metadata: reportData,
  };

  console.log("Inserting service purchase:", purchaseData);

  const { error } = await supabase
    .from("service_purchases")
    .upsert(purchaseData, { 
      onConflict: "stripe_payment_intent_id", 
      returning: "minimal" 
    });

  if (error) {
    console.error("Failed to log service purchase:", error);
    throw error;
  }

  console.log(`Service purchase logged successfully for coach ${coachSlug}`);
}

async function logServicePurchaseFailure(pi: Stripe.PaymentIntent) {
  const reportData = pi.metadata;
  
  // Check if this is a service purchase
  if (reportData?.purchase_type !== 'service') {
    return; // Not a service purchase, skip
  }

  const coachSlug = reportData.coach_slug;
  if (!coachSlug) {
    console.error("Failed service purchase missing coach_slug in metadata");
    return;
  }

  console.log(`Processing failed service purchase for coach slug: ${coachSlug}`);

  // Resolve coach ID from slug
  const coachId = await resolveCoachFromSlug(coachSlug);

  const failureData = {
    stripe_session_id: reportData.stripe_session_id || pi.id,
    stripe_payment_intent_id: pi.id,
    coach_id: coachId,
    coach_slug: coachSlug,
    service_title: reportData.service_title || 'Service Purchase',
    service_description: reportData.service_description || null,
    service_price_original: reportData.service_price || 'Unknown',
    amount_cents: pi.amount,
    platform_fee_cents: 0,
    coach_payout_cents: 0,
    customer_email: reportData.guest_email || 'guest@example.com',
    customer_name: reportData.customer_name || null,
    stripe_customer_id: typeof pi.customer === 'string' ? pi.customer : null,
    payment_status: 'failed',
    receipt_url: null,
    purchase_metadata: { ...reportData, failure_reason: pi.last_payment_error?.message || 'Unknown failure' },
  };

  const { error } = await supabase
    .from("service_purchases")
    .upsert(failureData, { 
      onConflict: "stripe_payment_intent_id", 
      returning: "minimal" 
    });

  if (error) {
    console.error("Failed to log service purchase failure:", error);
  }
}

/* ───────── Payment‑method helpers ───────── */

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
    active:                  true,
    email,
    card_brand:              pm.card?.brand ?? null,
    card_last4:              pm.card?.last4 ?? null,
    exp_month:               pm.card?.exp_month ?? null,
    exp_year:                pm.card?.exp_year ?? null,
    fingerprint:             pm.card?.fingerprint ?? null,
    status_reason:           null,
    status_changed_at:       null,
    billing_name:            pm.billing_details?.name ?? null,
    billing_address_line1:   pm.billing_details?.address?.line1 ?? null,
    billing_address_line2:   pm.billing_details?.address?.line2 ?? null,
    city:                    pm.billing_details?.address?.city ?? null,
    state:                   pm.billing_details?.address?.state ?? null,
    postal_code:             pm.billing_details?.address?.postal_code ?? null,
    country:                 pm.billing_details?.address?.country ?? null,
  };

  const { error } = await supabase
    .from("payment_method")
    .insert(row, { ignoreDuplicates: true });
  if (error) throw error;
}

/* centralised deactivation */
async function deactivateCard(
  criteria: { userId?: string; pmId?: string },
  reason: "card_expired" | "user_removed" | "stripe_failed",
) {
  const now = new Date().toISOString();

  const q = supabase
    .from("payment_method")
    .update({ active: false, status_reason: reason, status_changed_at: now });

  if (criteria.pmId) q.eq("stripe_payment_method_id", criteria.pmId);
  else if (criteria.userId) q.eq("user_id", criteria.userId).eq("active", true);
  else return;

  const { error } = await q;
  if (error) console.error(`Failed to deactivate card (${reason}):`, error);
}

/* ───────── Top‑up helpers ───────── */

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
      /* ─────────────────────────── PAYMENT‑METHOD EVENTS ────────────────── */

      case "payment_method.updated": {
        const pm = evt.data.object as Stripe.PaymentMethod;
        if (pm.type !== "card") break;

        const now = new Date();
        const expMonth  = pm.card?.exp_month ?? 0;
        const expYear   = pm.card?.exp_year  ?? 0;
        const expired =
          expYear < now.getUTCFullYear() ||
          (expYear === now.getUTCFullYear() && expMonth < (now.getUTCMonth() + 1));

        if (expired) {
          await deactivateCard({ pmId: pm.id }, "card_expired");
        }
        break;
      }

      case "payment_method.detached": {
        const pm = evt.data.object as Stripe.PaymentMethod;
        await deactivateCard({ pmId: pm.id }, "user_removed");
        break;
      }

      /* ─────────────────────────── CARD SAVE ────────────────────────────── */

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

      /* ───────────────────── PAYMENT SUCCESS (topups + services) ───────────── */

      case "payment_intent.succeeded": {
        const piRaw = evt.data.object as Stripe.PaymentIntent;
        const pi    = await stripe.paymentIntents.retrieve(
          piRaw.id,
          { expand: ["charges"] },
        );

        // Check if this is a service purchase first
        if (pi.metadata?.purchase_type === 'service') {
          await logServicePurchase(pi as Stripe.PaymentIntent);
        } else {
          // Handle as topup if user_id is present
          const userId = pi.metadata?.user_id;
          if (userId) await logTopupSuccess(userId, pi as Stripe.PaymentIntent);
        }
        break;
      }

      /* charge.succeeded fires too: upsert prevents duplicates */
      case "charge.succeeded": {
        const ch = evt.data.object as Stripe.Charge;
        
        if (ch.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(
            ch.payment_intent as string,
            { expand: ["charges"] },
          );

          // Check if this is a service purchase first
          if (pi.metadata?.purchase_type === 'service') {
            await logServicePurchase(pi as Stripe.PaymentIntent);
          } else {
            // Handle as topup
            let userId = ch.metadata?.user_id as string | undefined;
            if (!userId && ch.customer) {
              const cust = await stripe.customers.retrieve(ch.customer as string);
              userId = (cust as Stripe.Customer).metadata?.user_id;
            }
            if (userId) {
              await logTopupSuccess(userId, pi as Stripe.PaymentIntent);
            }
          }
        }
        break;
      }

      /* ───────────────────── FAILURES & CARD LOCKOUT ────────────────────── */

      case "payment_intent.payment_failed": {
        const pi = evt.data.object as Stripe.PaymentIntent;

        // Check if this is a service purchase first
        if (pi.metadata?.purchase_type === 'service') {
          await logServicePurchaseFailure(pi);
        } else {
          // Handle as topup failure
          const userId = pi.metadata?.user_id;
          if (userId) {
            await logTopupFailure(userId, pi);
            await deactivateCard({ userId }, "stripe_failed");
          }
        }
        break;
      }

      case "charge.failed": {
        const ch = evt.data.object as Stripe.Charge;
        
        // For charge failures, we need to check the payment intent
        if (ch.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(ch.payment_intent as string);
          
          if (pi.metadata?.purchase_type === 'service') {
            await logServicePurchaseFailure(pi);
          } else {
            // Handle as topup failure
            let userId = ch.metadata?.user_id as string | undefined;
            if (!userId && ch.customer) {
              const cust = await stripe.customers.retrieve(ch.customer as string);
              userId = (cust as Stripe.Customer).metadata?.user_id;
            }
            if (userId) await deactivateCard({ userId }, "stripe_failed");
          }
        }
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
