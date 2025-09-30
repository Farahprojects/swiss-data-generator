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

    // Temporarily disabled - will implement smarter caching later
    // For now, assume all authenticated users have active subscriptions
    setSubscriptionStatus({
      isActive: true,
      plan: 'active',
      status: 'active',
      loading: false,
      error: null
    });
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
