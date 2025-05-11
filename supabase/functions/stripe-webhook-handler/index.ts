
/* ========================================================================== *
   Supabase Edge Function – Stripe Webhook Handler
   Author:  YOU
   Purpose: Verify Stripe HMAC, store every event once, update user credits
   Runtime: Deno Deploy / Supabase Edge
 * ========================================================================== */

import { serve }  from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe     from "https://esm.sh/stripe@12.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ────────────────────────────── ENV ────────────────────────────────────── */

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

for (const key of REQUIRED_ENV) {
  if (!Deno.env.get(key)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const STRIPE_SECRET_KEY        = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET    = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY= Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/* ─────────────────────────── CLIENTS ───────────────────────────────────── */

const stripe   = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ───────────────────────────── CORS  ───────────────────────────────────── */

const CORS = {
  "Access-Control-Allow-Origin":  "*",                 // fine for Stripe (server-to-server)
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/* ────────────────── UTILS: constant-time string compare ────────────────── */

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ────────────────────── Verify Stripe HMAC (Web Crypto) ────────────────── */

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
): Promise<void> {
  const parts = sigHeader.split(",").reduce<Record<string,string>>((acc, p) => {
    const [k, v] = p.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const ts  = parts.t;
  const sigs= parts.v1 ? parts.v1.split(" ") : [];
  if (!ts || !sigs.length) throw new Error("Malformed Stripe-Signature header");

  // Replay protection
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > toleranceSec) {
    throw new Error("Timestamp outside tolerance");
  }

  const encoder = new TextEncoder();
  const signedPayload = `${ts}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload),
  );
  const expected = Array.from(new Uint8Array(signatureBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!sigs.some((sig) => secureCompare(sig, expected))) {
    throw new Error("Signature mismatch");
  }
}

/* ─────────────── Persist Stripe event exactly once  ────────────────────── */

async function upsertEvent(evt: any): Promise<boolean> {
  const { error, data } = await supabase
    .from("stripe_webhook_events")
    .insert(
      {
        stripe_event_id:  evt.id,
        stripe_event_type:evt.type,
        stripe_kind:      evt.type?.split(".")[0] ?? "unknown",
        stripe_customer_id:
          evt.data?.object?.customer ?? null,
        payload:          evt,          // JSONB column recommended
        processed:        false,
      },
      { ignoreDuplicates: true },
    )
    .select("id");

  if (error) throw error;
  return data.length > 0;
}

/* ───────────────–  Mark event processed / errored  ─────────────────────── */

async function markEvent(
  eventId: string,
  values: Record<string, unknown>,
) {
  await supabase
    .from("stripe_webhook_events")
    .update(values)
    .eq("stripe_event_id", eventId);
}

/* ──────────────────────  BUSINESS LOGIC HELPERS  ───────────────────────── */

async function creditUser(
  userId: string,
  usd: number,
  stripePid: string,
): Promise<void> {
  const { error } = await supabase.rpc("add_user_credits", {
    _user_id:    userId,
    _amount_usd: usd,
    _type:       "topup",
    _description:"Stripe auto-top-up",
    _stripe_pid: stripePid,
  });
  if (error) throw error;
}

/* ───────────────────────── MAIN HANDLER ────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return new Response("Bad request body", { status: 400, headers: CORS });
  }

  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) {
    return new Response("Missing Stripe-Signature", { status: 400, headers: CORS });
  }

  try {
    await verifyStripeSignature(raw, sigHeader, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Signature error:", err.message);
    return new Response("Signature verification failed", { status: 400, headers: CORS });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: CORS });
  }

  // Store every event exactly once
  try {
    const fresh = await upsertEvent(event);
    if (!fresh) return new Response("Already processed", { status: 200, headers: CORS });
  } catch (err) {
    console.error("❌ DB error:", err.message);
    return new Response("DB error", { status: 500, headers: CORS });
  }

  /* ───────────── Handle the events we care about ───────────── */

  try {
    switch (event.type) {
      /* ------------------------------------------------------- */
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const userId = pi.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");
        
        // If this is a topup request, update the topup queue record
        if (pi.metadata?.topup_request_id) {
          await supabase
            .from("topup_queue")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
              error_message: null
            })
            .eq("id", pi.metadata.topup_request_id);
        }
        
        await creditUser(userId, pi.amount / 100, pi.id);
        await markEvent(event.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }
      /* ------------------------------------------------------- */
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");
        if (!session.payment_intent) throw new Error("payment_intent id missing");

        // If this is a topup request, update the topup queue record
        if (session.metadata?.topup_request_id) {
          await supabase
            .from("topup_queue")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
              error_message: null
            })
            .eq("id", session.metadata.topup_request_id);
        }

        const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
        if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
          throw new Error(`PaymentIntent ${pi.id} not succeeded (${pi.status})`);
        }

        await creditUser(userId, pi.amount / 100, pi.id);
        await markEvent(event.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }
      /* ------------------------------------------------------- */
      default:
        // Unknown / un-handled event type -> OK (keep stored, unprocessed)
        console.info("ℹ️  Ignored event type:", event.type);
    }
  } catch (err) {
    console.error("❌ Handler error:", err.message);
    await markEvent(event.id, { processing_error: err.message });
    return new Response("processing error", { status: 500, headers: CORS });
  }

  return new Response("ok", { status: 200, headers: CORS });
});
