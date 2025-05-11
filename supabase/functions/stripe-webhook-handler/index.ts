
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
  paymentMethodId: string | null = null, // Add payment method ID parameter
): Promise<void> {
  const { error } = await supabase.rpc("add_user_credits", {
    _user_id:    userId,
    _amount_usd: usd,
    _type:       "topup",
    _description:"Stripe auto-top-up",
    _stripe_pid: stripePid,
  });
  
  if (error) throw error;
  
  // If we have a payment method ID, update the credit_transactions table
  if (paymentMethodId) {
    // Find the transaction that was just created by the RPC call
    const { data: transactions, error: txError } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("stripe_pid", stripePid)
      .eq("user_id", userId)
      .order("ts", { ascending: false })
      .limit(1);
    
    if (txError) {
      console.error("Error finding transaction:", txError.message);
      return;
    }
    
    if (transactions && transactions.length > 0) {
      // Update the transaction with the payment method ID
      const { error: updateError } = await supabase
        .from("credit_transactions")
        .update({ stripe_payment_method_id: paymentMethodId })
        .eq("id", transactions[0].id);
      
      if (updateError) {
        console.error("Error updating transaction with payment method ID:", updateError.message);
      } else {
        console.log(`Successfully added payment method ID ${paymentMethodId} to transaction ${transactions[0].id}`);
      }
    }
  }
}

// New function to handle saving payment method details from a setup session
async function savePaymentMethodDetails(
  userId: string, 
  setupIntent: any
): Promise<void> {
  try {
    // Get the payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method);
    
    if (!paymentMethod) {
      console.error("Could not retrieve payment method details");
      return;
    }
    
    // Create a transaction record to store the payment method info
    const { error } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        type: 'setup',
        amount_usd: 0, // No charge for setup
        description: 'Payment method setup',
        stripe_payment_method_id: paymentMethod.id,
        card_brand: paymentMethod.card?.brand || 'unknown',
        card_last4: paymentMethod.card?.last4 || '****',
        stripe_customer_id: paymentMethod.customer,
        payment_method_type: paymentMethod.type
      });
    
    if (error) {
      console.error("Error saving payment method details:", error.message);
      return;
    }
    
    console.log(`Successfully saved payment method details for user ${userId}, method ${paymentMethod.id}`);
  } catch (err) {
    console.error("Error in savePaymentMethodDetails:", err);
  }
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
        
        // Get the payment method ID from the payment intent
        const paymentMethodId = pi.payment_method;
        console.log(`Payment intent succeeded with payment method: ${paymentMethodId}`);
        
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
        
        await creditUser(userId, pi.amount / 100, pi.id, paymentMethodId);
        await markEvent(event.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }
      /* ------------------------------------------------------- */
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.user_id;
        if (!userId) throw new Error("metadata.user_id missing");
        
        // Handle payment session
        if (session.mode === "payment" && session.payment_intent) {
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

          // Retrieve the full payment intent to get payment_method
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
            throw new Error(`PaymentIntent ${pi.id} not succeeded (${pi.status})`);
          }

          // Extract payment_method from the payment intent
          const paymentMethodId = pi.payment_method;
          console.log(`Checkout completed with payment method: ${paymentMethodId}`);

          await creditUser(userId, pi.amount / 100, pi.id, paymentMethodId);
        }
        // Handle setup session (payment method update/setup)
        else if (session.mode === "setup" && session.setup_intent) {
          console.log(`Setup session completed: ${session.setup_intent}`);
          
          // Retrieve setup intent to get payment method details
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
          await savePaymentMethodDetails(userId, setupIntent);
        }
        
        await markEvent(event.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }
      /* ------------------------------------------------------- */
      case "setup_intent.succeeded": {
        const intent = event.data.object;
        const userId = intent.metadata?.user_id;
        const paymentMethodId = intent.payment_method;
        
        if (!userId || !paymentMethodId) {
          console.error("Missing user_id or payment_method from setup_intent");
          throw new Error("Missing user_id or payment_method from setup_intent");
        }
        
        // Fetch payment method details
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Save minimal info to credit_transactions
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          stripe_payment_method_id: paymentMethodId,
          card_brand: pm.card?.brand || null,
          card_last4: pm.card?.last4 || null,
          type: "card_setup",
          description: "Saved payment method via setup intent",
        });
        
        await markEvent(event.id, { processed: true, processed_at: new Date().toISOString() });
        break;
      }
      /* ------------------------------------------------------- */
      case "payment_method.attached": {
        const pm = event.data.object;
        const customer = pm.customer;
        if (!customer || pm.type !== "card") break;
        
        // Optional logging or sync if needed
        console.log(`Payment method attached to customer ${customer}: ${pm.id}`);
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
