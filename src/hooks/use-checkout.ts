
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";

type LineItem = { price: string; quantity: number };

export const useCheckout = () => {
  const { toast } = useToast();
  const [visiblePlan, setVisiblePlan] = useState<string>();
  const [addOnLines, setAddOnLines] = useState<Record<string, LineItem>>({});
  const [loading, setLoading] = useState(false);

  const toggleAddOn = (name: string) => {
    const priceId = getPriceId(name);
    console.log(`Toggling add-on: ${name}, Price ID: ${priceId}`);
    
    setAddOnLines((prev) =>
      prev[name] 
        ? (() => { const p = { ...prev }; delete p[name]; return p; })() 
        : { ...prev, [name]: { price: priceId, quantity: 1 } }
    );
  };

  const begin = (planName: string) => {
    setVisiblePlan(planName);
    setAddOnLines({});
  };

  const close = () => {
    setVisiblePlan(undefined);
  };

  const continueToStripe = async () => {
    if (!visiblePlan) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceIds: [
            getPriceId(visiblePlan), 
            ...Object.values(addOnLines).map(item => item.price)
          ],
          planType: visiblePlan,
          addOns: Object.keys(addOnLines)
        }
      });
      
      if (error) throw new Error(error.message || "Failed to create checkout session");
      if (!data?.url) throw new Error("No checkout URL returned");
      
      const checkoutWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
      
      if (!checkoutWindow) {
        toast({ 
          title: "Popup Blocked", 
          description: "Please allow popups and try again, or click the link we've added to continue.",
          variant: "destructive"
        });
        const tempLink = document.createElement('a');
        tempLink.href = data.url;
        tempLink.target = '_blank';
        tempLink.rel = 'noopener noreferrer';
        tempLink.click();
      } else {
        close();
        toast({ 
          title: "Opening Checkout", 
          description: "Complete your payment in the new window.",
        });
      }
      
    } catch (err: any) {
      console.error("Checkout process error:", err);
      toast({ 
        title: "Checkout failed", 
        description: err.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    visiblePlan,
    addOnLines,
    loading,
    toggleAddOn,
    begin,
    close,
    continueToStripe
  };
};
