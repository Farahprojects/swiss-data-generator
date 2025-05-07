import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno-native Stripe webhook signature verification
import { verifyStripeWebhookSignature } from "https://deno.land/x/stripe_webhook_verify@1.0.1/mod.ts";

// ── env --------------------------------------------------------------------
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── clients ---------------------------------------------------------------
const stripe   = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── helper: store event, return true if new --------------------------------
async function upsertEvent(
  evt: any,
  customerId?: string,
): Promise<boolean> {
  const kind = evt.type?.split(".")[0] ?? "unknown";

  const { error, data } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: kind,
        stripe_customer_id: customerId,
        payload: evt, // If you get a JSON error, use: JSON.stringify(evt)
      },
      { ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

// ── webhook entry ----------------------------------------------------------
serve(async (req) => {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response("Bad request (body)", { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("⚠️  Missing Stripe signature header");
    return new Response("Missing Stripe signature", { status: 400 });
  }

  // Verify Stripe signature using stripe-webhook-verify (Deno native)
  try {
    await verifyStripeWebhookSignature({
      payload: rawBody,
      header: signature,
      secret: STRIPE_WEBHOOK_SECRET,
      tolerance: 300, // seconds (Stripe default)
    });
  } catch (err) {
    console.error("⚠️  Webhook signature failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Parse the event payload
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const customerId =
    event.data?.object && "customer" in event.data.object
      ? event.data.object.customer
      : null;

  const isNew = await upsertEvent(event, customerId);
  if (!isNew) return new Response("already processed", { status: 200 });

  // ---------- handle PAYMENT INTENT SUCCEEDED -----------------------------
  if (event.type === "payment_intent.succeeded") {
    try {
      const pi = event.data.object;
      const userId = pi.metadata?.user_id;
      if (!userId)
        throw new Error("payment_intent missing metadata.user_id");
      const amountUsd = pi.amount_received / 100;
      const { error } = await supabase.rpc("add_user_credits", {
        _user_id: userId,
        _amount_usd: amountUsd,
        _type: "topup",
        _description: "Stripe auto‑top‑up",
        _stripe_pid: pi.id,
      });
      if (error) throw error;
      await supabase
        .from("stripe_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("stripe_event_id", event.id);

    } catch (err) {
      console.error("Top‑up processing error:", err.message);
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: err.message })
        .eq("stripe_event_id", event.id);

      return new Response("processing error", { status: 500 });
    }
  }

  // ---------- handle CHECKOUT SESSION COMPLETED ---------------------------
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (!userId)
        throw new Error("checkout.session missing metadata.user_id");
      if (!session.payment_intent)
        throw new Error("checkout.session missing payment_intent id");

      // Look up PaymentIntent for amount & status
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent);

      if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
        throw new Error(
          `PaymentIntent ${pi.id} is not succeeded. Status: ${pi.status}`
        );
      }

      const amountUsd = pi.amount_received / 100;
      const { error } = await supabase.rpc("add_user_credits", {
        _user_id: userId,
        _amount_usd: amountUsd,
        _type: "topup",
        _description: "Stripe auto‑top‑up",
        _stripe_pid: pi.id,
      });
      if (error) throw error;

      await supabase
        .from("stripe_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("stripe_event_id", event.id);

    } catch (err) {
      console.error("Checkout top-up processing error:", err.message);
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: err.message })
        .eq("stripe_event_id", event.id);

      return new Response("processing error", { status: 500 });
    }
  }

  // ---------- add more event types as needed ------------------------------
  return new Response("ok", { status: 200 });
});
