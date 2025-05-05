
// ---------------------------------------------------------------------------
// supabase/functions/stripe-webhook-handler/index.ts
//
// • Saves every Stripe event in stripe_webhook_events  (idempotent)
// • Credits user balance when a PaymentIntent succeeds
//   (requires user_id in PaymentIntent metadata)
// ---------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  evt: Stripe.Event,
  customerId?: string,
): Promise<boolean> {
  const kind = evt.type.split(".")[0] ?? "unknown";

  const { error, data } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: kind,
        stripe_customer_id: customerId,
        payload: evt,
      },
      { ignoreDuplicates: true }  // idempotent insert
    )
    .select("id");                // will be [] if duplicate

  if (error) throw error;
  return data.length > 0;         // true = freshly inserted
}

// ── webhook entry ----------------------------------------------------------
serve(async (req) => {
  let rawBody: string;
  try {
    rawBody = await req.text();   // Deno: raw body as string
  } catch {
    return new Response("Bad request (body)", { status: 400 });
  }

  // Verify Stripe signature
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("⚠️  Webhook signature failed", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Record every event (idempotent)
  const isNew = await upsertEvent(
    event,
    (event.data.object as any).customer,
  );

  // If duplicate, acknowledge quickly
  if (!isNew) return new Response("already processed", { status: 200 });

  // ---------- handle PAYMENT INTENT SUCCEEDED -----------------------------
  if (event.type === "payment_intent.succeeded") {
    try {
      const pi = event.data.object as Stripe.PaymentIntent;

      // Ensure metadata.user_id was set when you created the PI
      const userId = pi.metadata?.user_id;
      if (!userId) throw new Error("payment_intent missing metadata.user_id");

      const amountUsd = pi.amount_received / 100;

      // credit balance via DB helper
      const { error } = await supabase.rpc("add_user_credits", {
        _user_id:     userId,
        _amount_usd:  amountUsd,
        _type:        "topup",
        _description: "Stripe auto‑top‑up",
        _stripe_pid:  pi.id,
      });
      if (error) throw error;

      // mark event processed
      await supabase
        .from("stripe_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("stripe_event_id", event.id);

    } catch (err) {
      console.error("Top‑up processing error:", err.message);

      // flag error on the event row
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: err.message })
        .eq("stripe_event_id", event.id);

      return new Response("processing error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
});
