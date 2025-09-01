import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders })
    }

    console.log(`Deleting account for user: ${user.id}`)

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-08-16',
    })

    // Get user's Stripe customer ID if it exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    // Cancel any active subscriptions and remove payment methods
    if (profile?.stripe_customer_id) {
      try {
        // Get and cancel all active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active'
        })

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id)
          console.log(`Cancelled subscription: ${subscription.id}`)
        }

        // Detach all payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: 'card'
        })

        for (const paymentMethod of paymentMethods.data) {
          await stripe.paymentMethods.detach(paymentMethod.id)
          console.log(`Detached payment method: ${paymentMethod.id}`)
        }

        console.log(`Cleaned up Stripe data for customer: ${profile.stripe_customer_id}`)
      } catch (stripeError) {
        console.error('Error cleaning up Stripe data:', stripeError)
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // Use the database function to delete the user account
    const { error: deleteError } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: user.id
    })

    if (deleteError) {
      console.error('Database deletion error:', deleteError)
      return new Response(JSON.stringify({ 
        error: 'Failed to delete account',
        details: deleteError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Successfully deleted account for user: ${user.id}`)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Account deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})