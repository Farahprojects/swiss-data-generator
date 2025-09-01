
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { loadStripe } from '@stripe/stripe-js'

interface PaymentMethod {
  id: string
  card_brand: string
  card_last4: string
  exp_month: number
  exp_year: number
  active: boolean
}

export function useBilling() {
  const { user } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPaymentMethod = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_method')
        .select('id, card_brand, card_last4, exp_month, exp_year, active')
        .eq('user_id', user.id)
        .eq('active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setPaymentMethod(data || null)
    } catch (err) {
      console.error('Error fetching payment method:', err)
      setError('Failed to load payment method')
    } finally {
      setLoading(false)
    }
  }

  const setupCard = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const response = await fetch('/functions/v1/billing-setup-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to create setup intent')
      }

      const { client_secret } = await response.json()
      
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
      if (!stripe) throw new Error('Stripe failed to load')

      const { error: stripeError } = await stripe.confirmSetup({
        elements: null,
        clientSecret: client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/settings?billing_setup=success`
        }
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      // Refetch payment method after successful setup
      await fetchPaymentMethod()
    } catch (err) {
      console.error('Setup card error:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup card')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteCard = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const response = await fetch('/functions/v1/billing-delete-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete payment method')
      }

      const result = await response.json()
      
      // Clear local state
      setPaymentMethod(null)
      
      return result
    } catch (err) {
      console.error('Delete card error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentMethod()
  }, [user])

  return {
    paymentMethod,
    loading,
    error,
    setupCard,
    deleteCard,
    refetch: fetchPaymentMethod
  }
}
