import React from 'react';
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  icon: string;
  onSubscribe: () => void;
}

export const PricingPlan: React.FC<PricingPlanProps> = ({
  name,
  price,
  description,
  features,
  cta,
  highlight,
  icon,
  onSubscribe,
}) => {
  const { isLoading, handleCheckout } = useStripeCheckout();

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg overflow-hidden border ${
        highlight ? 'border-primary' : 'border-gray-100'
      } flex flex-col`}
    >
      {highlight && (
        <div className="bg-primary text-white py-2 text-center text-sm font-medium">
          Most Popular
        </div>
      )}
      <div className="p-8 flex-grow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-2xl font-bold text-primary">{name}</h3>
        </div>
        <div className="mb-4">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-gray-600">/month</span>
        </div>
        <p className="text-gray-600 mb-6">{description}</p>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-8 pt-0">
        <Button 
          className={`w-full py-6 ${
            highlight ? '' : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => handleCheckout(name)}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting to checkout..." : cta}
        </Button>
      </div>
    </div>
  );
};
