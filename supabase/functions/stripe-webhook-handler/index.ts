import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── ENV -------------------------------------------------------------------
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── CLIENTS ---------------------------------------------------------------
const stripe   = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── CORS Headers ----------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// ── Secure Compare --------------------------------------------------------
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Stripe Signature Verification -----------------------------------------
async function verifyStripeSignature(payload: string, signature: string, secret: string, tolerance = 300): Promise<void> {
  // Parse Stripe-Signature
  const sigParts = signature.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = sigParts.t;
  const signatures = sigParts.v1 ? sigParts.v1.split(" ") : [];
  if (!timestamp || signatures.length === 0) throw new Error("Invalid Stripe signature format");

  // Stripe: replay attack defense
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > tolerance) throw new Error("Webhook timestamp expired");

  // HMAC
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (!signatures.some(s => secureCompare(expected, s))) throw new Error("Signature does not match");
}

// ── Helper: Insert Event Uniquely -----------------------------------------
async function upsertEvent(evt: any, customerId?: string): Promise<boolean> {
  const kind = evt.type?.split(".")[0] ?? "unknown";
  const { error, data } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id: evt.id,
        stripe_event_type: evt.type,
        stripe_kind: kind,
        stripe_customer_id: customerId ?? null,
        payload: evt, // Use JSON.stringify(evt) if DB column is text
        processed: false,
      },
      { ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

// ── Handler --------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Read and verify signature
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    return new Response("Bad request (body)", { status: 400, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400, headers: corsHeaders });
  }

  try {
    await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  // Parse event JSON
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }
  const customerId = event.data?.object?.customer ?? null;

  try {
    const isNew = await upsertEvent(event, customerId);
    if (!isNew) {
      return new Response("already processed", { status: 200, headers: corsHeaders });
    }
  } catch (err) {
    console.error("DB error upserting event:", err.message);
    return new Response(`Database error: ${err.message}`, { status: 500, headers: corsHeaders });
  }

  // ---- PAYMENT INTENT SUCCEEDED -----------------------------------------
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const userId = pi.metadata?.user_id;
    if (!userId) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: "Missing user_id" })
        .eq("stripe_event_id", event.id);
      return new Response("payment_intent missing metadata.user_id", { status: 400, headers: corsHeaders });
    }
    const amountUsd = pi.amount_received / 100;
    const { error } = await supabase.rpc("add_user_credits", {
      _user_id: userId,
      _amount_usd: amountUsd,
      _type: "topup",
      _description: "Stripe auto‑top‑up",
      _stripe_pid: pi.id,
    });
    if (error) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: error.message })
        .eq("stripe_event_id", event.id);
      return new Response("processing error", { status: 500, headers: corsHeaders });
    }
    await supabase
      .from("stripe_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
  }

  // ---- CHECKOUT SESSION COMPLETED ---------------------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    if (!userId) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: "Missing user_id" })
        .eq("stripe_event_id", event.id);
      return new Response("checkout.session missing metadata.user_id", { status: 400, headers: corsHeaders });
    }
    if (!session.payment_intent) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: "Missing payment_intent id" })
        .eq("stripe_event_id", event.id);
      return new Response("checkout.session missing payment_intent id", { status: 400, headers: corsHeaders });
    }
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
    if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: `PaymentIntent ${pi.id} not succeeded. Status: ${pi.status}` })
        .eq("stripe_event_id", event.id);
      return new Response("PaymentIntent not succeeded", { status: 400, headers: corsHeaders });
    }
    const amountUsd = pi.amount_received / 100;
    const { error } = await supabase.rpc("add_user_credits", {
      _user_id: userId,
      _amount_usd: amountUsd,
      _type: "topup",
      _description: "Stripe auto‑top‑up",
      _stripe_pid: pi.id,
    });
    if (error) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: error.message })
        .eq("stripe_event_id", event.id);
      return new Response("processing error", { status: 500, headers: corsHeaders });
    }
    await supabase
      .from("stripe_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
  }

  // ---- (Add more event handlers if needed) ------------------------------
  return new Response("ok", { status: 200, headers: corsHeaders });
});
