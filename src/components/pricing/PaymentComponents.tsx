import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { addOns } from "@/utils/pricing";
import { AddonCard } from "./AddonCard";

export interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon: string;
}

const useStripeCheckout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<{ 
    loading: boolean; 
    product?: string;
    selectedAddons: string[];
    showUpsellDialog: boolean;
  }>({
    loading: false,
    selectedAddons: [],
    showUpsellDialog: false
  });

  const startCheckoutFlow = (productName: string) => {
    setState(prev => ({
      ...prev,
      product: productName,
      showUpsellDialog: true,
      selectedAddons: []
    }));
  };

  const toggleAddon = (addonName: string) => {
    setState(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonName)
        ? prev.selectedAddons.filter(addon => addon !== addonName)
        : [...prev.selectedAddons, addonName]
    }));
  };

  const handleCheckout = async () => {
    if (!state.product) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const priceIds = [
        getPriceId(state.product),
        ...state.selectedAddons.map(addon => getPriceId(addon))
      ].filter(Boolean);

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceIds },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");
      
      window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message ?? "Could not start Stripe session.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  return { 
    isLoading: state.loading, 
    startCheckoutFlow, 
    handleCheckout, 
    toggleAddon,
    selectedPlan: state.product,
    selectedAddons: state.selectedAddons,
    showUpsellDialog: state.showUpsellDialog,
    setShowUpsellDialog: (show: boolean) => 
      setState(prev => ({ ...prev, showUpsellDialog: show }))
  };
};

export const UpsellDialog = () => {
  const {
    selectedPlan,
    selectedAddons,
    toggleAddon,
    handleCheckout,
    isLoading,
    showUpsellDialog,
    setShowUpsellDialog,
  } = useStripeCheckout();

  const relevantAddons = addOns.filter(addon => {
    if (selectedPlan === "Starter") return true;
    if (selectedPlan === "Growth") return addon.name === "Relationship Compatibility";
    return false;
  });

  if (relevantAddons.length === 0) {
    if (showUpsellDialog) {
      handleCheckout();
      setShowUpsellDialog(false);
    }
    return null;
  }

  return (
    <Sheet open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-2">
          <SheetTitle className="text-2xl font-bold">
            Enhance Your {selectedPlan} Plan
          </SheetTitle>
          <SheetDescription className="text-base">
            {selectedPlan === "Starter"
              ? "Select add-ons to supercharge your experience"
              : "Add relationship compatibility to your plan"}
          </SheetDescription>
        </SheetHeader>

        <div className="my-6 space-y-4">
          {relevantAddons.map((addon, index) => (
            <AddonCard
              key={index}
              {...addon}
              isSelected={selectedAddons.includes(addon.name)}
              onToggle={() => toggleAddon(addon.name)}
            />
          ))}
        </div>

        <SheetFooter className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => setShowUpsellDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading
              ? "Processing..."
              : `Continue with ${selectedAddons.length} Add-on${
                  selectedAddons.length !== 1 ? "s" : ""
                }`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export const PricingPlan = ({ name, price, description, features, cta, highlight = false, icon }: PricingPlanProps) => {
  const { isLoading, startCheckoutFlow } = useStripeCheckout();

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
          onClick={() => startCheckoutFlow(name)}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting…" : cta}
        </Button>
      </div>
    </div>
  );
};
