/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler (cards + top-ups + services)
   (2025-06-25) – Hardened for production & null-safe
 * ========================================================================== */

import { serve }    from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe       from "https://esm.sh/stripe@12.14.0?target=deno&deno-std=0.224.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/* ─────────────── ENV ─────────────── */

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

/* ─────────────── CORS ─────────────── */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/* ───────── Signature verify (same algo; kept) ───────── */

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

/* ───────── Helper: log + swallow (never crash Stripe) ───────── */

function warn(msg: string, extra?: unknown) {
  console.warn(`[webhook] ${msg}`, extra ?? "");
}

/* ───────── Event bookkeeping (unchanged, but non-fatal) ───────── */

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
  if (error && error.code !== "23505") throw error;
}

async function markEvent(evtId: string, ok: boolean, errMsg?: string) {
  await supabase.from("stripe_webhook_events")
    .update({
      processed: ok,
      processed_at: new Date().toISOString(),
      processing_error: errMsg ?? null,
    })
    .eq("stripe_event_id", evtId);
}

/* ───────── Coach resolver (null-safe) ───────── */

async function resolveCoachFromSlug(slug?: string): Promise<string | null> {
  if (!slug) return null;
  const { data, error } = await supabase
    .from("coach_websites")
    .select("coach_id")
    .eq("site_slug", slug)
    .single();

  if (error || !data?.coach_id) {
    warn(`coach_slug "${slug}" not found`);
    return null;
  }
  return data.coach_id;
}

/* ───────── Service purchase logger (null coach OK) ───────── */

async function logServicePurchase(pi: Stripe.PaymentIntent, success = true) {
  const meta = pi.metadata ?? {};

  // Resolve coach (may be null)
  const coachId = await resolveCoachFromSlug(meta.coach_slug);

  // Monetary breakdown (5 % fee)
  const platformFeeCents = Math.floor(pi.amount * 0.05);
  const coachPayoutCents = pi.amount - platformFeeCents;

  const receiptUrl =
    pi.charges?.data?.[0]?.receipt_url ?? null;

  // Best-effort customer email
  let customerEmail: string | null = meta.guest_email ?? null;
  if (!customerEmail && pi.customer && typeof pi.customer === "string") {
    try {
      const cust = await stripe.customers.retrieve(pi.customer);
      if (!cust.deleted) customerEmail = cust.email ?? null;
    } catch (_) { /* swallow */ }
  }

  const row = {
    stripe_payment_intent_id: pi.id,
    stripe_session_id:       meta.stripe_session_id ?? pi.id,
    coach_id:                coachId,               // may be null now
    coach_slug:              meta.coach_slug ?? null,
    service_title:           meta.service_title ?? "Service",
    service_description:     meta.service_description ?? null,
    service_price_original:  meta.service_price ?? null,
    amount_cents:            pi.amount,
    platform_fee_cents:      success ? platformFeeCents : 0,
    coach_payout_cents:      success ? coachPayoutCents : 0,
    customer_email:          customerEmail,
    customer_name:           meta.customer_name ?? null,
    stripe_customer_id:      typeof pi.customer === "string" ? pi.customer : null,
    payment_status:          success ? "completed" : "failed",
    receipt_url:             success ? receiptUrl : null,
    purchase_metadata:       meta,
  };

  const { error } = await supabase
    .from("service_purchases")
    .upsert(row, {
      onConflict: "stripe_payment_intent_id",
      returning: "minimal",
    });
  if (error) throw error;
}

/* ───────── Guest Report Payment Status Update ───────── */

async function updateGuestReportPaymentStatus(guestReportId: string) {
  console.log(`[WEBHOOK] Updating guest_report ${guestReportId} to 'paid'`);
  
  const { error: updateError } = await supabase
    .from('guest_reports')
    .update({
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', guestReportId)
    .eq('payment_status', 'pending'); // Idempotency check

  if (updateError) {
    console.error(`[WEBHOOK] Error updating guest_report ${guestReportId} to paid:`, updateError);
    throw updateError;
  }

  console.log(`[WEBHOOK] Successfully updated guest_report ${guestReportId} to 'paid'`);
}

/* ───────── Top-up helpers (unchanged but with try/catch) ───────── */

async function logTopup(userId: string, pi: Stripe.PaymentIntent, status: "completed" | "failed") {
  const table = status === "completed" ? "topup_logs" : "topup_logs_failed";

  const payload: any = {
    user_id: userId,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    status,
  };
  if (status === "completed") {
    payload.receipt_url =
      pi.charges?.data?.[0]?.receipt_url ?? null;
  } else {
    payload.message = pi.last_payment_error?.message ?? "Unknown failure";
  }

  const { error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: "stripe_payment_intent_id", returning: "minimal" });

  if (error) throw error;
}

async function deactivateCardsForUser(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payment_method")
    .update({
      active: false,
      status_reason: "stripe_failed",
      status_changed_at: now,
    })
    .eq("user_id", userId)
    .eq("active", true);

  if (error) warn("Failed to deactivate cards", error);
}

/* ───────── MAIN ───────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const rawBody = await req.text().catch(() => "");
  const sig     = req.headers.get("stripe-signature") ?? "";

  /* 1️⃣ verify signature */
  try {
    await verifyStripeSignature(rawBody, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    warn("Signature verification failed", err);
    return new Response("Bad signature", { status: 400, headers: CORS_HEADERS });
  }

  const evt = JSON.parse(rawBody);

  /* 2️⃣ dedupe / log */
  try {
    await upsertEvent(evt);
  } catch (err) {
    warn("Failed to upsert event", err);
  }

  /* 3️⃣ handle */
  let ok = true;
  let errMsg: string | undefined;

  try {
    switch (evt.type) {

      /* ——— NEW: Checkout session completed ——— */
      case "checkout.session.completed": {
        const session = evt.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        console.log(`[WEBHOOK] Processing checkout.session.completed: ${session.id}`);
        console.log(`[WEBHOOK] Session metadata:`, metadata);
        console.log(`[WEBHOOK] Session payment_status:`, session.payment_status);

        // Check if this is a guest report purchase
        if (metadata?.purchase_type === 'report' && metadata?.guest_report_id) {
          console.log(`[WEBHOOK] Handling checkout session for guest report: ${metadata.guest_report_id}`);

          // Only proceed if payment was successful
          if (session.payment_status === 'paid') {
            const guestReportId = metadata.guest_report_id;
            await updateGuestReportPaymentStatus(guestReportId);
          } else {
            console.log(`[WEBHOOK] Session payment_status is '${session.payment_status}', not 'paid'. Skipping update.`);
          }
        } else {
          console.log(`[WEBHOOK] Not a guest report purchase - purchase_type: ${metadata?.purchase_type}, guest_report_id: ${metadata?.guest_report_id}`);
        }
        break;
      }

      /* ——— Payment succeeded ——— */
      case "payment_intent.succeeded":
      case "charge.succeeded": {
        // Always fetch the PI (with charges) – covers both event types
        const piId =
          evt.type === "payment_intent.succeeded"
            ? (evt.data.object as Stripe.PaymentIntent).id
            : (evt.data.object as Stripe.Charge).payment_intent;

        if (!piId) break; // defensive

        const pi = await stripe.paymentIntents.retrieve(
          piId as string,
          { expand: ["charges"] },
        );

        if (pi.metadata?.purchase_type === "service") {
          await logServicePurchase(pi as Stripe.PaymentIntent, true);
        } else {
          const userId = pi.metadata?.user_id;
          if (userId) await logTopup(userId, pi as Stripe.PaymentIntent, "completed");
        }
        break;
      }

      /* ——— Payment failed ——— */
      case "payment_intent.payment_failed":
      case "charge.failed": {
        const piId =
          evt.type === "payment_intent.payment_failed"
            ? (evt.data.object as Stripe.PaymentIntent).id
            : (evt.data.object as Stripe.Charge).payment_intent;

        if (!piId) break;

        const pi = await stripe.paymentIntents.retrieve(piId as string);

        if (pi.metadata?.purchase_type === "service") {
          await logServicePurchase(pi as Stripe.PaymentIntent, false);
        } else {
          const userId = pi.metadata?.user_id;
          if (userId) {
            await logTopup(userId, pi as Stripe.PaymentIntent, "failed");
            await deactivateCardsForUser(userId);
          }
        }
        break;
      }

      /* ignore others */
    }
  } catch (err) {
    ok = false;
    errMsg = String(err);
    warn("Handler logic error", err);
  } finally {
    await markEvent(evt.id, ok, errMsg);
  }

  return new Response("ok", { status: ok ? 200 : 500, headers: CORS_HEADERS });
});
