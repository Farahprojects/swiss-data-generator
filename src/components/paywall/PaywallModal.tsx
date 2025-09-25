import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [pricingPlans, setPricingPlans] = useState<PricingData[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  // Fetch pricing plans
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('price_list')
          .select('id, name, description, unit_price_usd, product_code')
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




  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
      >
        {/* Header */}
        <header className="w-full py-4 flex justify-end items-center px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-grow overflow-y-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="w-full max-w-6xl mx-auto">
            {/* Header Text */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-light text-gray-900 tracking-tight mb-4">
                Choose Your Plan
              </h1>
              <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
                Select the perfect plan for your journey
              </p>
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
                    isSelected={false}
                    onSelect={() => {}}
                    loading={false}
                  />
                ))}
              </div>
            )}

          </div>
        </main>

        {/* Footer with timing tool kit */}
        <footer className="py-8 text-center text-sm text-gray-500 font-light border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4">
            <p className="mb-4">© {new Date().getFullYear()} Therai. All rights reserved.</p>
            <div className="text-xs text-gray-400">
              <p>Secure payment processed by Stripe. Cancel anytime.</p>
            </div>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaywallModal;
