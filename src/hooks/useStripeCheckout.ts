
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";

export const useStripeCheckout = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (productName: string) => {
    if (isLoading) return; // Prevent multiple clicks
    
    try {
      setIsLoading(true);
      const priceId = getPriceId(productName);
      console.log(`Starting checkout with ${productName}, price ID: ${priceId}`);
      
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

  return {
    isLoading,
    handleCheckout
  };
};
