
import React, { createContext, useContext, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutSheet } from "./CheckoutSheet";
import type { PaymentFlowState } from "@/types/payment";

interface CheckoutState {
  visiblePlan: string | undefined;
  addOnLines: Record<string, boolean>;
  loading: boolean;
  flowState?: PaymentFlowState;
  begin: (planName: string) => void;
  close: () => void;
  toggleAddOn: (name: string) => void;
  continueToStripe: () => Promise<void>;
}

const CheckoutContext = createContext<CheckoutState | null>(null);

export const useCheckoutWizard = () => {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error("useCheckoutWizard must be used within PaymentProvider");
  return context;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visiblePlan, setVisiblePlan] = useState<string>();
  const [addOnLines, setAddOnLines] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const begin = (planName: string) => {
    setVisiblePlan(planName);
    setAddOnLines({});
  };

  const close = () => {
    setVisiblePlan(undefined);
    setAddOnLines({});
  };

  const toggleAddOn = (name: string) => {
    setAddOnLines(prev => {
      const newState = { ...prev };
      if (prev[name]) {
        delete newState[name];
      } else {
        newState[name] = true;
      }
      return newState;
    });
  };

  const continueToStripe = async () => {
    try {
      setLoading(true);
      
      const addOns = Object.keys(addOnLines);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planType: visiblePlan,
          addOns
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: 'Checkout Error',
        description: err instanceof Error ? err.message : 'Failed to start checkout process',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const value = {
    visiblePlan,
    addOnLines,
    loading,
    begin,
    close,
    toggleAddOn,
    continueToStripe
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
      <CheckoutSheet />
    </CheckoutContext.Provider>
  );
};
