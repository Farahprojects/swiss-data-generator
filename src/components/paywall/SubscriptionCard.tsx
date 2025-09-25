import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface SubscriptionCardProps {
  plan: {
    id: string;
    name: string;
    description: string;
    unit_price_usd: number;
    product_code: string;
  };
  index: number;
  isSelected: boolean;
  onSelect: (planId: string) => void;
  loading: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  index,
  isSelected,
  onSelect,
  loading
}) => {
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

  const isPopular = plan.id === 'subscription_professional' || plan.name.toLowerCase().includes('professional');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      <Card 
        className={`border-0 shadow-lg bg-white rounded-3xl overflow-hidden h-full cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-gray-900 shadow-xl' : 'hover:shadow-xl'
        } ${isPopular ? 'ring-2 ring-gray-900' : ''}`}
        onClick={() => onSelect(plan.id)}
      >
        <CardContent className="p-8 text-center space-y-6 h-full flex flex-col">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            className="flex items-center justify-center h-12 w-12 mx-auto rounded-full bg-gray-900"
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>

          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-xl font-light text-gray-900 leading-tight">
              {plan.name}
            </h3>
            <p className="text-2xl font-light text-gray-600">
              {formatPrice(plan.unit_price_usd)}
              {plan.product_code === 'subscription' && (
                <span className="text-sm font-normal text-gray-500">/month</span>
              )}
            </p>
          </div>

          {/* Description */}
          <div className="flex-grow">
            <p className="text-sm font-light text-gray-600 leading-relaxed mb-4">
              {plan.description}
            </p>
            
            {/* Features */}
            <ul className="text-left space-y-2">
              {getPlanFeatures(plan.name).map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
            className="pt-2"
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(plan.id);
              }}
              disabled={loading}
              className={`w-full font-light py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 ${
                isPopular 
                  ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
              }`}
            >
              {loading ? 'Processing...' : 'Get Started'}
            </Button>
          </motion.div>

          {/* Security note */}
          <p className="text-xs text-gray-500 font-light">
            Secure payment powered by Stripe
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SubscriptionCard;
