import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'text-green-600';
      case 'past_due':
        return 'text-yellow-600';
      case 'canceled':
      case 'incomplete':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string | null) => {
    if (!status) return 'No subscription';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
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
    <div className="space-y-6 p-6">
      {/* Current Subscription Status - Only show if subscription is active */}
      {!isCanceled && (
        <Card className="border border-gray-200 rounded-xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-light text-gray-900 mb-4">Current Subscription</h3>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Status</p>
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Plan</p>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Next Billing Date</p>
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Status</p>
                  <p className={`text-base font-normal ${getStatusColor(subscription?.status)}`}>
                    {getStatusText(subscription?.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Plan</p>
                  <p className="text-base font-normal text-gray-900">
                    {subscription?.plan || 'No active plan'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-light text-gray-600 mb-1">Next Billing Date</p>
                  <p className="text-base font-normal text-gray-900">
                    {formatDate(subscription?.nextCharge)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-light text-gray-900 mb-4">
          {isCanceled ? 'Choose Your Plan' : 'Available Plans'}
        </h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="border-2 border-gray-200 rounded-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-gray-200 rounded-full animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePlans.map((plan) => {
              const isCurrentPlan = subscription?.plan === plan.name;
              const isUpdating = updatingPlanId === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={`border-2 rounded-xl transition-all ${
                    isCurrentPlan
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-normal text-gray-900">{plan.name}</h4>
                        {plan.description && (
                          <p className="text-sm font-light text-gray-600 mt-1">{plan.description}</p>
                        )}
                      </div>
                      {isCurrentPlan && !isCanceled && (
                        <CheckCircle2 className="w-5 h-5 text-gray-900 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-light text-gray-900">
                        ${plan.unit_price_usd.toFixed(2)}
                      </span>
                      <span className="text-sm font-light text-gray-600">/month</span>
                    </div>

                    {!isCurrentPlan && canChangePlan && (
                      <Button
                        onClick={() => handleUpdatePlan(plan)}
                        disabled={isUpdating}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full font-light"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Switch to this plan'
                        )}
                      </Button>
                    )}

                    {isCanceled && (
                      <Button
                        onClick={() => handleResubscribe(plan)}
                        disabled={isUpdating}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full font-light"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Subscribe to this plan'
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Subscription */}
      {isSubscriptionActive && (
        <Card className="border border-red-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-normal text-gray-900">Cancel Subscription</h4>
                <p className="text-sm font-light text-gray-600 mt-1">
                  Stop your subscription and lose access to premium features
                </p>
              </div>
              <Button
                onClick={() => setShowCancelModal(true)}
                variant="outline"
                className="rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-light"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
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

