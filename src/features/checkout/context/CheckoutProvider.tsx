import React, { createContext, useState, useContext, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPriceId } from "@/utils/pricing";

interface LineItem {
  price: string;
  quantity: number;
}

interface CheckoutContextValue {
  addOnLines: Record<string, LineItem>;
  toggleAddOn: (addOnName: string) => void;
  continueToStripe: () => Promise<void>;
  loading: boolean;
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

interface CheckoutProviderProps {
  children: ReactNode;
  planName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({
  children,
  planName,
  successUrl = "/signup?success=true",
  cancelUrl = "/pricing?canceled=true",
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addOnLines, setAddOnLines] = useState<Record<string, LineItem>>({});
  const [loading, setLoading] = useState(false);

  const toggleAddOn = (name: string) => {
    const priceId = getPriceId(name);
    console.log(`Toggling add-on: ${name}, Price ID: ${priceId}`);
    
    setAddOnLines((prev) =>
      prev[name] ? (() => { const p = { ...prev }; delete p[name]; return p; })() : { ...prev, [name]: { price: priceId, quantity: 1 } },
    );
  };

  const continueToStripe = async () => {
    if (!planName) return;

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

    const planPriceId = getPriceId(planName);
    if (!planPriceId) {
      toast({ 
        title: "Price mapping missing", 
        description: planName, 
        variant: "destructive" 
      });
      return;
    }
    
    const line_items = [{ price: planPriceId, quantity: 1 }, ...Object.values(addOnLines)];
    
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
        // Keep the current window open in development
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

  const value = {
    addOnLines,
    toggleAddOn,
    continueToStripe,
    loading
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};

export function useCheckoutContext() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckoutContext must be used within a CheckoutProvider");
  }
  return context;
}
