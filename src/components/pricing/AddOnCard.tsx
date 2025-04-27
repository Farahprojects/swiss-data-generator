import React from 'react';
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
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
  const { isLoading, handleCheckout } = useStripeCheckout();

  const handleSubscribe = () => {
    // Determine the addon type based on name
    let addonType = '';
    if (name.toLowerCase().includes('yearly')) {
      addonType = 'yearly-cycle';
    } else if (name.toLowerCase().includes('relationship')) {
      addonType = 'relationship';
    } else {
      addonType = 'transits';
    }
    
    handleCheckout(addonType);
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
            {isLoading ? "Redirecting to checkout..." : "Subscribe Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};
