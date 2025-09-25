import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders });
    }

    const { amount, description, successUrl, cancelUrl } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating one-shot checkout for user: ${user.id}, amount: ${amount}`);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      // Update profile with stripe_customer_id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      console.log(`Created new Stripe customer: ${customerId}`);
    }

    // Create checkout session for one-shot payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'One-time payment',
              description: description || 'One-time payment',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get("origin")}/chat?payment_status=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/chat?payment_status=cancelled`,
      metadata: {
        user_id: user.id,
        payment_type: 'one_shot'
      }
    });

    console.log(`Created checkout session: ${session.id} for user: ${user.id}`);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
