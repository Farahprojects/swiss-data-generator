import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string | null;
  status: string | null;
  loading: boolean;
  error: string | null;
  lastPaymentStatus: 'succeeded' | 'failed' | null;
  nextChargeDate: string | null;
  isPastDue: boolean;
  daysUntilCancellation: number | null;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    plan: null,
    status: null,
    loading: true,
    error: null,
    lastPaymentStatus: null,
    nextChargeDate: null,
    isPastDue: false,
    daysUntilCancellation: null
  });

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscriptionStatus({
        isActive: false,
        plan: null,
        status: null,
        loading: false,
        error: null,
        lastPaymentStatus: null,
        nextChargeDate: null,
        isPastDue: false,
        daysUntilCancellation: null
      });
      return;
    }

    try {
      // Query profiles table for actual subscription status
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_active, subscription_status, subscription_plan, last_payment_status, subscription_next_charge')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus({
          isActive: false,
          plan: null,
          status: null,
          loading: false,
          error: error.message,
          lastPaymentStatus: null,
          nextChargeDate: null,
          isPastDue: false,
          daysUntilCancellation: null
        });
        return;
      }

      const isActive = data?.subscription_active && 
                      ['active', 'trialing'].includes(data?.subscription_status || '');
      
      const isPastDue = data?.subscription_status === 'past_due';
      
      // Calculate days until cancellation (Stripe typically cancels after 14 days)
      let daysUntilCancellation: number | null = null;
      if (isPastDue && data?.subscription_next_charge) {
        const nextChargeDate = new Date(data.subscription_next_charge);
        const cancellationDate = new Date(nextChargeDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffTime = cancellationDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysUntilCancellation = diffDays > 0 ? diffDays : 0;
      }

      setSubscriptionStatus({
        isActive,
        plan: data?.subscription_plan || null,
        status: data?.subscription_status || null,
        loading: false,
        error: null,
        lastPaymentStatus: data?.last_payment_status as 'succeeded' | 'failed' | null || null,
        nextChargeDate: data?.subscription_next_charge || null,
        isPastDue,
        daysUntilCancellation
      });
    } catch (err) {
      console.error('Exception checking subscription:', err);
      setSubscriptionStatus({
        isActive: false,
        plan: null,
        status: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        lastPaymentStatus: null,
        nextChargeDate: null,
        isPastDue: false,
        daysUntilCancellation: null
      });
    }
  }, [user]);

  // Check subscription status on mount and when user changes
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  return {
    ...subscriptionStatus,
    refetch: checkSubscriptionStatus
  };
}
