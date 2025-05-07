
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

// ── Helper: Extract Payment Details ---------------------------------------
async function extractPaymentDetails(pi: any): Promise<Record<string, any>> {
  try {
    // Extract basic payment details
    const details: Record<string, any> = {
      stripe_pid: pi.id,
      amount_usd: pi.amount_received / 100,
    };

    // If we have a customer ID, try to get more details
    if (pi.customer) {
      try {
        const customer = await stripe.customers.retrieve(pi.customer);
        if (customer && !customer.deleted) {
          details.stripe_customer_id = customer.id;
          details.email = customer.email || null;
          details.full_name = customer.name || null;
          
          // Extract address details if available
          if (customer.address) {
            details.billing_address_line1 = customer.address.line1 || null;
            details.billing_address_line2 = customer.address.line2 || null;
            details.city = customer.address.city || null;
            details.state = customer.address.state || null;
            details.postal_code = customer.address.postal_code || null;
            details.country = customer.address.country || null;
          }
        }
      } catch (err) {
        console.error("Error fetching customer details:", err.message);
      }
    }

    // Try to get payment method details
    if (pi.payment_method) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(pi.payment_method);
        if (paymentMethod) {
          details.payment_method_type = paymentMethod.type || null;
          
          // For card payments, get the card details
          if (paymentMethod.type === 'card' && paymentMethod.card) {
            details.card_brand = paymentMethod.card.brand || null;
            details.card_last4 = paymentMethod.card.last4 || null;
          }
        }
      } catch (err) {
        console.error("Error fetching payment method details:", err.message);
      }
    }

    // Add payment status
    details.payment_status = pi.status || null;
    
    // Get invoice ID if it exists
    if (pi.invoice) {
      details.stripe_invoice_id = pi.invoice;
    }

    return details;
  } catch (err) {
    console.error("Error extracting payment details:", err.message);
    return {
      stripe_pid: pi.id,
      amount_usd: pi.amount_received / 100,
    };
  }
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
    
    // Extract extended payment and customer details
    const paymentDetails = await extractPaymentDetails(pi);
    console.log("Extracted payment details:", JSON.stringify(paymentDetails));

    // Add credits with enhanced transaction details
    const { error: creditsError } = await supabase.rpc("add_user_credits", {
      _user_id: userId,
      _amount_usd: amountUsd,
      _type: "topup",
      _description: "Stripe auto‑top‑up",
      _stripe_pid: pi.id,
    });

    if (creditsError) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: creditsError.message })
        .eq("stripe_event_id", event.id);
      return new Response("processing error", { status: 500, headers: corsHeaders });
    }

    // Store enhanced transaction details
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .update(paymentDetails)
      .eq("stripe_pid", pi.id)
      .eq("type", "topup");

    if (transactionError) {
      console.error("Error updating transaction with details:", transactionError.message);
      // We don't fail the webhook for this error since the credits were already added
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
    
    // Retrieve full PaymentIntent object to get details
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
    
    if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: `PaymentIntent ${pi.id} not succeeded. Status: ${pi.status}` })
        .eq("stripe_event_id", event.id);
      return new Response("PaymentIntent not succeeded", { status: 400, headers: corsHeaders });
    }
    
    const amountUsd = pi.amount_received / 100;
    
    // Extract extended payment and customer details
    const paymentDetails = await extractPaymentDetails(pi);
    console.log("Extracted checkout payment details:", JSON.stringify(paymentDetails));
    
    // Add credits with enhanced transaction details
    const { error: creditsError } = await supabase.rpc("add_user_credits", {
      _user_id: userId,
      _amount_usd: amountUsd,
      _type: "topup",
      _description: "Stripe auto‑top‑up",
      _stripe_pid: pi.id,
    });
    
    if (creditsError) {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_error: creditsError.message })
        .eq("stripe_event_id", event.id);
      return new Response("processing error", { status: 500, headers: corsHeaders });
    }

    // Store enhanced transaction details
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .update(paymentDetails)
      .eq("stripe_pid", pi.id)
      .eq("type", "topup");

    if (transactionError) {
      console.error("Error updating transaction with checkout details:", transactionError.message);
      // We don't fail the webhook for this error since the credits were already added
    }
    
    await supabase
      .from("stripe_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
  }

  // ---- (Add more event handlers if needed) ------------------------------
  return new Response("ok", { status: 200, headers: corsHeaders });
});
