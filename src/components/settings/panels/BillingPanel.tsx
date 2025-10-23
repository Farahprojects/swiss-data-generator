import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CancelSubscriptionModal } from '@/components/billing/CancelSubscriptionModal';

interface SubscriptionData {
  status: string | null;
  plan: string | null;
  nextCharge: string | null;
  active: boolean | null;
  subscriptionId: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  unit_price_usd: number;
  stripe_price_id: string | null;
}

export const BillingPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchBillingData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch subscription data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, subscription_next_charge, subscription_active, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setSubscription({
        status: profileData?.subscription_status || null,
        plan: profileData?.subscription_plan || null,
        nextCharge: profileData?.subscription_next_charge || null,
        active: profileData?.subscription_active || null,
        subscriptionId: profileData?.stripe_subscription_id || null,
      });

      // Fetch available plans
      const { data: plansData, error: plansError } = await supabase
        .from('price_list')
        .select('*')
        .eq('endpoint', 'subscription')
        .neq('id', 'test_50c');

      if (!plansError && plansData) {
        setAvailablePlans(plansData);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const handleUpdatePlan = async (plan: Plan) => {
    if (!plan.stripe_price_id) {
      toast.error('Invalid plan configuration');
      return;
    }

    setUpdatingPlanId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { newPriceId: plan.stripe_price_id },
      });

      if (error) {
        toast.error('Failed to update subscription');
        return;
      }

      toast.success('Subscription updated successfully');
      await fetchBillingData(); // Refresh billing data
    } catch (err) {
      console.error('Update subscription error:', err);
      toast.error('Failed to update subscription');
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getPlanDisplayName = (planName: string | null) => {
    if (!planName) return 'No plan';
    // Map plan names to UI-friendly names
    if (planName === 'Growth' || planName.includes('15')) return 'Growth';
    if (planName === 'Premium' || planName.includes('25')) return 'Premium';
    return planName;
  };

  const handleResubscribe = async (plan: Plan) => {
    if (!plan.stripe_price_id) {
      toast.error('Invalid plan configuration');
      return;
    }

    setUpdatingPlanId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId: plan.id,
          embedded: false,
        },
      });

      if (error) {
        toast.error('Failed to start checkout');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Resubscribe error:', err);
      toast.error('Failed to start checkout');
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const isSubscriptionActive = subscription?.active && ['active', 'trialing'].includes(subscription?.status || '');
  const canChangePlan = isSubscriptionActive && subscription?.status !== 'past_due';
  const isCanceled = subscription?.status === 'canceled' || !subscription?.active;

  return (
    <div className="space-y-6">
      {/* Current Subscription Info */}
      {isSubscriptionActive && (
        <div className="border-b pb-6">
          <h3 className="text-sm font-normal text-gray-900 mb-4">Current Subscription</h3>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-800">Plan</span>
            <span className="text-sm text-gray-900">{getPlanDisplayName(subscription?.plan)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-800">Next Billing Date</span>
            <span className="text-sm text-gray-900">{formatDate(subscription?.nextCharge)}</span>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="border-b pb-6">
        <h3 className="text-sm font-normal text-gray-900 mb-4">
          {isCanceled ? 'Choose Your Plan' : 'Plans'}
        </h3>
        
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-3">
            {availablePlans.map((plan) => {
              const isCurrentPlan = getPlanDisplayName(subscription?.plan) === plan.name;
              const isUpdating = updatingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">{plan.name}</span>
                    <span className="text-sm text-gray-600">${plan.unit_price_usd.toFixed(0)}/month</span>
                  </div>
                  
                  {isCurrentPlan && !isCanceled ? (
                    <span className="text-sm text-gray-600">Current</span>
                  ) : (
                    <Button
                      onClick={() => isSubscriptionActive ? handleUpdatePlan(plan) : handleResubscribe(plan)}
                      disabled={isUpdating}
                      size="sm"
                      className="bg-gray-900 hover:bg-gray-800 text-white rounded-full font-light px-6"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        isSubscriptionActive ? 'Upgrade' : 'Subscribe'
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Subscription */}
      {isSubscriptionActive && (
        <div>
          <h3 className="text-sm font-normal text-gray-900 mb-4">Cancel Subscription</h3>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-800">Stop your subscription</span>
            <Button
              onClick={() => setShowCancelModal(true)}
              size="sm"
              variant="outline"
              className="rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-light px-6"
            >
              Cancel Plan
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={fetchBillingData}
        currentPeriodEnd={subscription?.nextCharge}
      />
    </div>
  );
};

