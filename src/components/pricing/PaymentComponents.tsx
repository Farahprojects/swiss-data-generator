
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";
import { useAuth } from "@/contexts/AuthContext";

const useStripeCheckout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<{ loading: boolean; product?: string }>({
    loading: false,
  });

  const handleCheckout = async (productName: string) => {
    if (state.loading) return;

    const priceId = getPriceId(productName);
    if (!priceId) {
      toast({
        title: "Pricing Error",
        description: `Unknown product "${productName}". Contact support.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setState({ loading: true, product: productName });
      console.log("Starting checkout process for:", productName);
      console.log("User authenticated:", !!user);
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId, 
          userEmail: user?.email,
          successUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/pricing`
        },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");
      
      console.log("Redirecting to Stripe checkout");
      
      // Force full page navigation to prevent iframe issues
      window.location.href = data.url;
    } catch (err: any) {
      console.error("Stripe checkout error", err);
      toast({
        title: "Checkout failed",
        description: err.message ?? "Could not start Stripe session.",
        variant: "destructive",
      });
      setState({ loading: false });
    }
  };

  return { isLoading: state.loading, handleCheckout };
};

interface AddOnCardProps {
  name: string;
  price: string;
  description: string;
  details: string[];
  status?: string;  // Added status as an optional prop
}

export const AddOnCard: React.FC<AddOnCardProps> = ({
  name,
  price,
  description,
  details,
}) => {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md">
      <h3 className="text-xl font-bold text-primary">{name}</h3>
      <p className="text-gray-600">{description}</p>
      <p className="text-xl font-medium text-primary/80">{price}</p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 text-gray-700">
            Details
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 space-y-1 p-4 text-sm text-gray-600">
          {details.map((d, i) => (
            <p key={i} className="leading-relaxed">
              {d}
            </p>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

export const PricingPlan: React.FC<PricingPlanProps> = ({
  name,
  price,
  description,
  features,
  cta,
  highlight = false,
  icon,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanSelection = () => {
    setIsLoading(true);
    navigate("/pricing-funnel", { 
      state: { selectedPlan: name }
    });
  };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-primary ring-1 ring-primary/20" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 p-6">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>

      <div className="px-6">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 py-1 text-sm text-gray-700">
            <Check className="h-4 w-4 text-primary" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto p-6 pt-0">
        <p className="mb-4 text-3xl font-semibold text-primary">{price}</p>
        <Button
          className="w-full py-6"
          onClick={handlePlanSelection}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : cta}
        </Button>
      </div>
    </div>
  );
};
