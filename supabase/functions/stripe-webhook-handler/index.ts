
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe signature found");
    }

    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Log the webhook event
    const { error: logError } = await supabase
      .from('stripe_webhook_logs')
      .insert({
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        stripe_customer_id: (event.data.object as any).customer,
        payload: event.data.object,
      });

    if (logError) {
      logStep("Error logging webhook", logError);
      throw logError;
    }

    // Handle specific event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabase);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeletion(event.data.object as Stripe.Subscription, supabase);
        break;
    }

    // Update webhook log to mark as processed
    await supabase
      .from('stripe_webhook_logs')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("Error processing webhook", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabase: any) {
  const customerId = subscription.customer as string;
  const items = subscription.items.data;

  // Determine which products are in the subscription
  const hasStarterPlan = items.some(item => item.price.product === 'prod_starter');
  const hasGrowthPlan = items.some(item => item.price.product === 'prod_growth');
  const hasProfessionalPlan = items.some(item => item.price.product === 'prod_professional');
  const hasRelationshipCompatibility = items.some(item => item.price.product === 'prod_relationship');
  const hasYearlyCycle = items.some(item => item.price.product === 'prod_yearly');

  // Update or insert subscription record
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      has_starter_plan: hasStarterPlan,
      has_growth_plan: hasGrowthPlan,
      has_professional_plan: hasProfessionalPlan,
      has_relationship_compatibility: hasRelationshipCompatibility,
      has_yearly_cycle: hasYearlyCycle,
    }, {
      onConflict: 'stripe_subscription_id'
    });

  if (error) throw error;
}

async function handleSubscriptionDeletion(subscription: Stripe.Subscription, supabase: any) {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) throw error;
}
