
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

interface SimplePaymentMethod {
  id: string
  card_brand: string
  card_last4: string
  exp_month: number
  exp_year: number
  active: boolean
}

export function useBilling() {
  const { user } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<SimplePaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPaymentMethod = useCallback(async () => {
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
  }, [user])

  const setupCard = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      // Use create-checkout with mode: "setup" for payment method setup
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'setup',
          successUrl: `${window.location.origin}/settings?payment_setup=success`,
          cancelUrl: `${window.location.origin}/settings?payment_setup=cancelled`
        }
      })

      if (error) throw error
      if (!data?.url) throw new Error('No checkout URL returned')

      // Open in new tab (standard behavior)
      window.open(data.url, '_blank')
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

      // Clear local state
      setPaymentMethod(null)
      
      return { success: true }
    } catch (err) {
      console.error('Delete card error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    paymentMethod,
    loading,
    error,
    setupCard,
    deleteCard,
    refetch: fetchPaymentMethod
  }
}
