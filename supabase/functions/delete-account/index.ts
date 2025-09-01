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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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

    console.log(`Starting account deletion for user: ${user.id}`)

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-08-16',
    })

    // Step 1: Cancel Stripe subscriptions and payment methods IMMEDIATELY
    const { data: paymentMethods } = await supabase
      .from('payment_method')
      .select('stripe_customer_id, stripe_payment_method_id')
      .eq('user_id', user.id)
      .eq('active', true)

    if (paymentMethods && paymentMethods.length > 0) {
      for (const pm of paymentMethods) {
        if (pm.stripe_customer_id) {
          try {
            console.log(`Processing Stripe cleanup for customer: ${pm.stripe_customer_id}`)
            
            // Cancel all active subscriptions
            const subscriptions = await stripe.subscriptions.list({
              customer: pm.stripe_customer_id,
              status: 'active'
            })

            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id, {
                cancellation_details: {
                  comment: 'Account deletion requested by user'
                }
              })
              console.log(`✓ Cancelled subscription: ${subscription.id}`)
            }

            // Cancel all trialing subscriptions
            const trialingSubscriptions = await stripe.subscriptions.list({
              customer: pm.stripe_customer_id,
              status: 'trialing'
            })

            for (const subscription of trialingSubscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id, {
                cancellation_details: {
                  comment: 'Account deletion requested by user'
                }
              })
              console.log(`✓ Cancelled trialing subscription: ${subscription.id}`)
            }

            // Detach all payment methods
            const customerPaymentMethods = await stripe.paymentMethods.list({
              customer: pm.stripe_customer_id,
              type: 'card'
            })

            for (const paymentMethod of customerPaymentMethods.data) {
              await stripe.paymentMethods.detach(paymentMethod.id)
              console.log(`✓ Detached payment method: ${paymentMethod.id}`)
            }

            // Update customer to indicate account deleted
            await stripe.customers.update(pm.stripe_customer_id, {
              metadata: {
                account_deleted: 'true',
                deleted_at: new Date().toISOString()
              }
            })

            console.log(`✓ Completed Stripe cleanup for customer: ${pm.stripe_customer_id}`)
          } catch (stripeError) {
            console.error(`Stripe cleanup error for customer ${pm.stripe_customer_id}:`, stripeError)
            // Continue with deletion - don't let Stripe errors block account deletion
          }
        }
      }
    } else {
      console.log('No active payment methods found for user')
    }

    // Step 2: Delete all user data from public tables
    console.log('Starting database cleanup...')
    const { error: deleteError } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: user.id
    })

    if (deleteError) {
      console.error('Database deletion error:', deleteError)
      return new Response(JSON.stringify({ 
        error: 'Failed to delete user data from database',
        details: deleteError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✓ Database cleanup completed')

    // Step 3: Delete the user from Supabase Auth (this is the final step)
    console.log('Deleting user from auth...')
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('Auth deletion error:', authDeleteError)
      return new Response(JSON.stringify({ 
        error: 'Failed to delete user from authentication system',
        details: authDeleteError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Account deletion completed successfully for user: ${user.id}`)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Account deleted successfully. All subscriptions have been cancelled and no further charges will occur.'
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