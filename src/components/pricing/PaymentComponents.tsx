
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";

// Shared checkout hook
const useStripeCheckout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState<{ loading: boolean; product?: string }>({
    loading: false,
  });

  // Add performance logging
  useEffect(() => {
    console.log("useStripeCheckout hook initialized");
    return () => {
      console.log("useStripeCheckout hook cleanup");
    };
  }, []);

  const handleCheckout = async (productName: string) => {
    if (state.loading) return; // guard dbl‑clicks

    console.log(`Starting checkout for product: ${productName}`);
    const startTime = performance.now();

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
      console.log(`Invoking create-checkout function for ${productName}`);

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      const endTime = performance.now();
      console.log(`Checkout API call completed in ${(endTime - startTime).toFixed(2)}ms`);

      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");

      console.log("Redirecting to Stripe checkout URL");
      // React router fallback: open in new tab to preserve SPA state
      window.open(data.url, "_self");
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

// AddOnCard Component
interface AddOnCardProps {
  name: string;
  price: string;
  description: string;
  details?: string;
  dropdownItems: string[];
}

export const AddOnCard: React.FC<AddOnCardProps> = ({
  name,
  price,
  description,
  dropdownItems,
}) => {
  const { isLoading, handleCheckout } = useStripeCheckout();

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">{name}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
      <p className="text-3xl font-semibold text-primary">{price}</p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 text-gray-700">
            Details
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 space-y-1 p-4 text-sm text-gray-600">
          {dropdownItems.map((d, i) => (
            <p key={i} className="leading-relaxed">
              {d}
            </p>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        className="w-full"
        onClick={() => handleCheckout(name)}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting…" : "Subscribe Now"}
      </Button>
    </div>
  );
};

// PricingPlan Component
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
  const { isLoading, handleCheckout } = useStripeCheckout();

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-primary ring-1 ring-primary/20" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 p-6">
        {icon}
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
          onClick={() => handleCheckout(name)}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting…" : cta}
        </Button>
      </div>
    </div>
  );
};
