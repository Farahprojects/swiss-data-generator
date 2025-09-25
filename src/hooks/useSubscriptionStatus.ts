import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string | null;
  status: string | null;
  loading: boolean;
  error: string | null;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    plan: null,
    status: null,
    loading: true,
    error: null
  });

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscriptionStatus({
        isActive: false,
        plan: null,
        status: null,
        loading: false,
        error: null
      });
      return;
    }

    try {
      setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, subscription_active')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
        return;
      }

      const isActive = data?.subscription_active === true && 
                      data?.subscription_status === 'active';

      setSubscriptionStatus({
        isActive,
        plan: data?.subscription_plan || null,
        status: data?.subscription_status || null,
        loading: false,
        error: null
      });

    } catch (err) {
      console.error('Subscription status check failed:', err);
      setSubscriptionStatus(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription status'
      }));
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
