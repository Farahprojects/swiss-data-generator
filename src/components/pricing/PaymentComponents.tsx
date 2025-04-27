
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { addOns } from "@/utils/pricing";

// Define the missing PricingPlanProps interface
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
      
      // Collect price IDs for main plan and selected add-ons
      const priceIds = [
        getPriceId(state.product),
        ...state.selectedAddons.map(addon => getPriceId(addon))
      ].filter(Boolean);

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceIds },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");
      
      // Redirect to Stripe checkout
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
    setShowUpsellDialog
  } = useStripeCheckout();
  
  // Dynamically filter addons based on selected plan
  const relevantAddons = addOns.filter(addon => {
    if (selectedPlan === "Starter") return true;
    if (selectedPlan === "Growth") return addon.name === "Relationship Compatibility";
    return false;
  });

  if (relevantAddons.length === 0) {
    // If no relevant addons, proceed directly to checkout
    if (showUpsellDialog) {
      handleCheckout();
      setShowUpsellDialog(false);
    }
    return null;
  }

  return (
    <Dialog open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Enhance Your {selectedPlan} Plan
          </DialogTitle>
          <DialogDescription className="text-lg">
            {selectedPlan === "Starter" 
              ? "Select add-ons to supercharge your experience" 
              : "Add relationship compatibility to your plan"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {relevantAddons.map((addon, index) => (
            <Card 
              key={index} 
              className={`border ${selectedAddons.includes(addon.name) ? 'border-primary' : 'border-gray-200'}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-primary">{addon.name}</CardTitle>
                    <CardDescription>{addon.description}</CardDescription>
                  </div>
                  <div className="text-xl font-semibold text-primary">{addon.price}</div>
                </div>
              </CardHeader>
              <CardFooter>
                <Button
                  variant={selectedAddons.includes(addon.name) ? "default" : "outline"}
                  className="mt-2"
                  onClick={() => toggleAddon(addon.name)}
                >
                  {selectedAddons.includes(addon.name) ? "Remove" : "Add"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <DialogFooter>
          <div className="w-full flex flex-col sm:flex-row justify-between gap-3">
            <Button variant="outline" onClick={() => setShowUpsellDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={isLoading} 
              className="px-8"
            >
              {isLoading ? "Processing..." : `Continue with ${selectedAddons.length} Add-on${selectedAddons.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PricingPlan: React.FC<PricingPlanProps> = ({
  name,
  price,
  description,
  features,
  cta,
  highlight = false,
  icon,
}) => {
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
