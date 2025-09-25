import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Check, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingData {
  id: string;
  name: string;
  description: string;
  unit_price_usd: number;
  product_code: string;
}

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingData[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch pricing plans
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('price_list')
          .select('id, name, description, unit_price_usd, product_code')
          .eq('endpoint', 'subscription')
          .order('unit_price_usd', { ascending: true });

        if (error) {
          console.error('Error fetching pricing:', error);
        } else {
          setPricingPlans(data || []);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    };

    if (isOpen) {
      fetchPricing();
    }
  }, [isOpen]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: selectedPlan,
          success_url: `${window.location.origin}/chat`,
          cancel_url: `${window.location.origin}/chat`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription process');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getPlanFeatures = (planName: string) => {
    const features = {
      '10_monthly': [
        '10 threads per month',
        'Unlimited messages per thread',
        'Priority support',
        'Advanced features'
      ],
      '25_monthly': [
        '25 threads per month',
        'Unlimited messages per thread',
        'Priority support',
        'Advanced features',
        'Early access to new features'
      ],
      'one_shot': [
        'One-time payment',
        '10 threads total',
        'Unlimited messages per thread',
        'Lifetime access'
      ]
    };
    return features[planName as keyof typeof features] || [];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
                  <p className="text-gray-600">Unlock unlimited conversations and advanced features</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Pricing Plans */}
            {pricingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {pricingPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id
                        ? 'ring-2 ring-purple-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <div className="text-3xl font-bold text-gray-900 mb-4">
                          {formatPrice(plan.unit_price_usd)}
                          {plan.product_code === 'subscription' && (
                            <span className="text-sm font-normal text-gray-500">/month</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-6">
                          {plan.description}
                        </p>
                        
                        {/* Features */}
                        <ul className="space-y-2 text-left">
                          {getPlanFeatures(plan.name).map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Subscribe Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleSubscribe}
                disabled={!selectedPlan || loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Subscribe Now</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaywallModal;
