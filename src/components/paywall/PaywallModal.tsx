import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SubscriptionCard from './SubscriptionCard';

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
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-light text-gray-900 tracking-tight mb-4">
                Choose Your Plan
              </h2>
              <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
                Select the perfect plan for your journey
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Pricing Plans */}
            {pricingLoading ? (
              <div className="flex justify-center">
                <div className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-xl w-80"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {pricingPlans.map((plan, index) => (
                  <SubscriptionCard
                    key={plan.id}
                    plan={plan}
                    index={index}
                    isSelected={selectedPlan === plan.id}
                    onSelect={handlePlanSelect}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {/* Subscribe Button */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleSubscribe}
                disabled={!selectedPlan || loading}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-full font-light text-base transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Subscribe Now'
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
