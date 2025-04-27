
import React, { useState } from 'react';
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    try {
      setIsLoading(true);
      const priceId = getPriceId(name);
      console.log(`Starting checkout with ${name} plan, price ID: ${priceId}`);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log(`Redirecting to checkout: ${data.url}`);
        // Use a timeout to ensure state changes are processed before redirecting
        setTimeout(() => {
          window.location.href = data.url;
        }, 100);
      } else {
        console.error('No checkout URL returned:', data);
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Checkout Error",
        description: "Could not start the checkout process. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

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
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting to checkout..." : cta}
        </Button>
      </div>
    </div>
  );
};
