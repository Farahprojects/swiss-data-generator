import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Query users whose subscription_next_charge is today or past due
    const { data: profiles, error } = await supabaseClient
      .from("profiles")
      .select("id, email, stripe_customer_id, stripe_subscription_id")
      .eq("subscription_active", true)
      .lte("subscription_next_charge", `${today}T23:59:59.999Z`);

    if (error) {
      throw new Error(`Error fetching profiles: ${error.message}`);
    }

    console.log(`Found ${profiles?.length || 0} profiles to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    // Process each profile
    for (const profile of profiles || []) {
      try {
        if (!profile.stripe_subscription_id) {
          console.log(`Skipping profile ${profile.id} - no subscription ID`);
          continue;
        }

        // Get subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        
        const isActive = subscription.status === "active";
        const nextCharge = new Date(subscription.current_period_end * 1000).toISOString();

        // Update profile with latest Stripe data
        await supabaseClient
          .from("profiles")
          .update({
            subscription_active: isActive,
            subscription_next_charge: nextCharge,
            last_payment_status: subscription.status,
          })
          .eq("id", profile.id);

        console.log(`Synced profile ${profile.id}: active=${isActive}, next_charge=${nextCharge}`);
        syncedCount++;

      } catch (error) {
        console.error(`Error syncing profile ${profile.id}:`, error);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      synced_count: syncedCount,
      error_count: errorCount,
      total_profiles: profiles?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in sync-subscriptions-due-today:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});