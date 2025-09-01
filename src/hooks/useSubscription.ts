import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export function useSubscription() {
  const [loading, setLoading] = useState(false)

  const createCheckout = async (priceId: string, successUrl?: string, cancelUrl?: string) => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session found')
      }

      const response = await fetch('/functions/v1/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          successUrl,
          cancelUrl
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
      
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    createCheckout,
    loading
  }
}