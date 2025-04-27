import React, { useState } from "react";
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

// ────────────────────────────────────────────────────────────────────────────
// Shared checkout hook ------------------------------------------------------
// ────────────────────────────────────────────────────────────────────────────

const useStripeCheckout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState<{ loading: boolean; product?: string }>({
    loading: false,
  });

  const handleCheckout = async (productName: string) => {
    if (state.loading) return;

    const priceId = getPriceId(productName);
    if (!priceId) {
      toast({
        title: "Pricing Error",
        description: `Unknown product “${productName}”. Contact support.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setState({ loading: true, product: productName });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");
      window.location.assign(data.url);
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

// ────────────────────────────────────────────────────────────────────────────
// Add‑On Card ---------------------------------------------------------------
// ────────────────────────────────────────────────────────────────────────────
interface AddOnCardProps {
  name: string;
  price: string;
  description: string;
  details: string[];
  status?: "included" | "upgrade";
}

export const AddOnCard: React.FC<AddOnCardProps> = ({
  name,
  price,
  description,
  details,
  status = "upgrade",
}) => {
  const label = status === "included" ? "Included in plan" : "Available at checkout";
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">{name}</h3>
      </div>
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

      <span
        className={`rounded-md px-3 py-1 text-xs font-semibold ${
          status === "included" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Pricing Plan Card ---------------------------------------------------------
// ────────────────────────────────────────────────────────────────────────────
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
          onClick={() => handleCheckout(name)}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting…" : cta}
        </Button>
      </div>
    </div>
  );
};
