import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ...env and client setup code unchanged...

async function upsertEvent(evt: Stripe.Event, customerId?: string): Promise<boolean> {
  const kind = evt.type.split(".")[0] ?? "unknown";
  const { error, data } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: kind,
        stripe_customer_id: customerId,
        payload: evt, // If you get an error here, use: payload: JSON.stringify(evt),
      },
      { ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("⚠️  Webhook signature failed", err.message, {rawBody, signature});
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Defensive: get customer if available
  const customerId = event.data.object && "customer" in event.data.object
    ? (event.data.object as any).customer
    : null;

  const isNew = await upsertEvent(event, customerId);
  if (!isNew) return new Response("already processed", { status: 200 });

  if (event.type === "payment_intent.succeeded") {
    try {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = pi.metadata?.user_id;
      if (!userId) throw new Error("payment_intent missing metadata.user_id");
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
  } else {
    // Extra: log unhandled event types!
    console.log("Unhandled event type:", event.type, event.data.object);
  }

  return new Response("ok", { status: 200 });
});
