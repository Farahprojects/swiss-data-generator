
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401 })
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Invalid token', { status: 401 })
    }

    // Get user's current payment method
    const { data: paymentMethod } = await supabase
      .from('payment_method')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (!paymentMethod?.stripe_payment_method_id) {
      return new Response('No active payment method found', { status: 400 })
    }

    // Detach payment method from Stripe customer
    await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id)

    // Update our database to mark as inactive
    await supabase
      .from('payment_method')
      .update({ 
        active: false,
        status_reason: 'detached_by_user',
        status_changed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('stripe_payment_method_id', paymentMethod.stripe_payment_method_id)

    // Check if user has active subscription and handle accordingly
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_active, subscription_status, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    let subscriptionWarning = null
    if (profile?.subscription_active && profile.stripe_subscription_id) {
      subscriptionWarning = "Your subscription remains active but future payments may fail without a valid payment method."
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment method removed successfully',
      warning: subscriptionWarning
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Delete card error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
