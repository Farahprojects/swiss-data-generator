
import React, { useState } from 'react';
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AddOnCardProps {
  name: string;
  price: string;
  description: string;
  details: string;
  onSubscribe: () => void;
}

export const AddOnCard: React.FC<AddOnCardProps> = ({
  name,
  price,
  description,
  details,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      // Determine the addon type based on name
      let addonType = '';
      if (name.toLowerCase().includes('yearly')) {
        addonType = 'yearly-cycle';
      } else if (name.toLowerCase().includes('relationship')) {
        addonType = 'relationship';
      } else {
        addonType = 'transits';
      }
      
      const priceId = getPriceId(addonType);
      console.log(`Starting checkout with ${addonType} add-on, price ID: ${priceId}`);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;
      
      if (data?.url) {
        console.log(`Redirecting to checkout: ${data.url}`);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Could not start the checkout process. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 
      hover:shadow-xl transition-all duration-300 
      group overflow-hidden 
      transform hover:-translate-y-2">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-primary">{name}</h3>
        <div className="text-2xl font-bold mb-2">
          {price}
          <span className="text-sm text-gray-600 ml-1">/month</span>
        </div>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="space-y-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                <Info className="mr-2 h-4 w-4" />
                More Info
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-4">
              <p className="text-sm text-gray-700">{details}</p>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            className="w-full"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Subscribe Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};
