
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Package } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// ────────────────────────────────────────────────────────────────────────────
// Shared checkout hook ------------------------------------------------------
// ────────────────────────────────────────────────────────────────────────────

const useStripeCheckout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<{ loading: boolean; product?: string }>({
    loading: false,
  });
  
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const startCheckoutFlow = (productName: string) => {
    setSelectedPlan(productName);
    setShowUpsellDialog(true);
    // Reset selected addons when starting a new checkout flow
    setSelectedAddons([]);
  };

  const toggleAddon = (addonName: string) => {
    setSelectedAddons(prev => {
      if (prev.includes(addonName)) {
        return prev.filter(name => name !== addonName);
      } else {
        return [...prev, addonName];
      }
    });
  };

  const handleCheckout = async () => {
    if (state.loading || !selectedPlan) return;

    // Get price IDs for main plan and addons
    const planPriceId = getPriceId(selectedPlan);
    const addonPriceIds = selectedAddons.map(addon => getPriceId(addon)).filter(Boolean);
    
    const allPriceIds = [planPriceId, ...addonPriceIds].filter(Boolean);

    if (allPriceIds.length === 0) {
      toast({
        title: "Pricing Error",
        description: "Could not determine pricing for selection.",
        variant: "destructive",
      });
      return;
    }

    try {
      setState({ loading: true, product: selectedPlan });
      console.log("Starting checkout process for:", selectedPlan, "with addons:", selectedAddons);
      console.log("User authenticated:", !!user);
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceIds: allPriceIds },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing in response");
      
      console.log("Redirecting to Stripe checkout");
      // Use window.location.href for full page redirect to prevent iframe issues
      const dest = data.url;
      try {
        // If we're nested, break out of the frame
        if (window.top && window.top !== window.self) {
          window.top.location.assign(dest);
        } else {
          window.location.assign(dest);
        }
      } catch {
        // Fallback for very tight CSP / sandboxed iframes
        window.open(dest, "_blank", "noopener,noreferrer");
      }
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

  return { 
    isLoading: state.loading, 
    startCheckoutFlow, 
    handleCheckout, 
    showUpsellDialog, 
    setShowUpsellDialog,
    selectedPlan,
    selectedAddons,
    toggleAddon
  };
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
}) => {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md">
      <h3 className="text-xl font-bold text-primary">{name}</h3>
      <p className="text-gray-600">{description}</p>
      <p className="text-xl font-medium text-primary">{price}</p>

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

// ────────────────────────────────────────────────────────────────────────────
// Upsell Dialog -------------------------------------------------------------
// ────────────────────────────────────────────────────────────────────────────
export const UpsellDialog = () => {
  const { 
    showUpsellDialog, 
    setShowUpsellDialog, 
    selectedPlan,
    selectedAddons, 
    toggleAddon,
    handleCheckout, 
    isLoading 
  } = useStripeCheckout();
  
  const { addOns } = require("@/utils/pricing");
  
  // Filter addons to show based on selected plan
  const relevantAddons = addOns.filter(addon => {
    if (selectedPlan === "Starter") {
      return true; // Show all addons for Starter plan
    } else if (selectedPlan === "Growth") {
      return addon.name === "Relationship Compatibility"; // Only show Relationship for Growth
    } else if (selectedPlan === "Professional") {
      return false; // No upsells for Professional
    }
    return false;
  });

  if (relevantAddons.length === 0) {
    // Skip the upsell dialog if there are no relevant addons
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
            Complete Your {selectedPlan} Plan
          </DialogTitle>
          <DialogDescription className="text-lg">
            {selectedPlan === "Starter" 
              ? "Enhance your experience with these powerful add-ons"
              : "Add relationship compatibility analysis to your plan"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {relevantAddons.map((addon, index) => (
            <Card key={index} className={`border ${selectedAddons.includes(addon.name) ? 'border-primary' : 'border-gray-200'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{addon.name}</CardTitle>
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
                  {selectedAddons.includes(addon.name) ? "Added" : "Add to plan"}
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
            <Button onClick={handleCheckout} disabled={isLoading} className="px-8">
              {isLoading ? "Processing..." : selectedAddons.length > 0 
                ? `Continue with ${selectedPlan} + ${selectedAddons.length} add-on${selectedAddons.length > 1 ? 's' : ''}`
                : `Continue with ${selectedPlan} only`
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
