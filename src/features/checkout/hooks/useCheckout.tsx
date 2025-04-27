
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPriceId } from "@/utils/pricing";
import { useCheckoutContext } from "../context/CheckoutProvider";

export interface CheckoutOptions {
  planName?: string;
  priceId?: string;
  additionalItems?: Array<{ price: string; quantity: number }>;
  successUrl?: string;
  cancelUrl?: string;
}

export function useCheckout() {
  // When used inside the CheckoutProvider, use the context
  try {
    return useCheckoutContext();
  } catch (e) {
    // If not inside provider, use the standalone implementation
    return useStandaloneCheckout();
  }
}

function useStandaloneCheckout() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addOnLines, setAddOnLines] = useState<Record<string, { price: string; quantity: number }>>({});

  const toggleAddOn = (name: string) => {
    const priceId = getPriceId(name);
    console.log(`Toggling add-on: ${name}, Price ID: ${priceId}`);
    
    setAddOnLines((prev) =>
      prev[name] ? (() => { const p = { ...prev }; delete p[name]; return p; })() : { ...prev, [name]: { price: priceId, quantity: 1 } },
    );
  };

  const beginCheckout = async (options: CheckoutOptions) => {
    const { planName, priceId, additionalItems = [], successUrl = "/signup?success=true", cancelUrl = "/pricing?canceled=true" } = options;

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to continue",
        variant: "destructive",
      });
      
      // Redirect to login page with return URL
      window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    let planPriceId = priceId;
    if (!planPriceId && planName) {
      planPriceId = getPriceId(planName);
    }

    if (!planPriceId) {
      toast({
        title: "Invalid configuration",
        description: "No valid price ID provided",
        variant: "destructive",
      });
      return;
    }
    
    const line_items = [{ price: planPriceId, quantity: 1 }, ...Object.values(addOnLines), ...additionalItems];
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", { 
        body: { 
          priceIds: line_items.map(item => item.price),
          successUrl,
          cancelUrl
        }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing");
      
      // Open checkout in new window in development
      if (data.isDevelopment) {
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site to proceed with checkout",
            variant: "destructive"
          });
        }
      } else {
        // In production, redirect the main window
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ 
        title: "Checkout failed", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const continueToStripe = () => {
    // This is not used in standalone mode
    console.error("continueToStripe called outside of CheckoutProvider context");
    return Promise.resolve();
  };

  return {
    addOnLines,
    toggleAddOn,
    beginCheckout,
    continueToStripe,
    loading
  };
}
