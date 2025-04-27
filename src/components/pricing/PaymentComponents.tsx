
import React, { useState, createContext, useContext, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPriceId } from "@/utils/pricing";
import { paymentSession } from "@/services/payment-session";

type LineItem = { price: string; quantity: number };
interface CheckoutContextType {
  begin: (planName: string) => void;
  addOnLines: Record<string, LineItem>;
  toggleAddOn: (addOnName: string) => void;
  close: () => void;
  visiblePlan?: string;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);
export const useCheckoutWizard = () => useContext(CheckoutContext)!;

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();
  const [visiblePlan, setVisiblePlan] = useState<string>();
  const [addOnLines, setAddOnLines] = useState<Record<string, LineItem>>({});
  const [loading, setLoading] = useState(false);
  const [stripeWindow, setStripeWindow] = useState<Window | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // Function to check payment verification status
  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId }
      });
      
      if (error) {
        console.error("Error checking payment status:", error);
        return false;
      }
      
      if (data?.success && data?.paymentStatus === "paid") {
        // Payment verified - stop polling and show success message
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        
        toast({
          title: "Payment Successful",
          description: "Your payment has been verified. Redirecting to signup...",
        });
        
        // Redirect to signup page with session_id param
        window.location.href = `/signup?success=true&session_id=${sessionId}`;
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Payment verification check failed:", err);
      return false;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const toggleAddOn = (name: string) => {
    const priceId = getPriceId(name);
    console.log(`Toggling add-on: ${name}, Price ID: ${priceId}`);
    
    setAddOnLines((prev) =>
      prev[name] ? (() => { const p = { ...prev }; delete p[name]; return p; })() : { ...prev, [name]: { price: priceId, quantity: 1 } },
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
    
    const planPriceId = getPriceId(visiblePlan);
    if (!planPriceId) {
      toast({ title: "Price mapping missing", description: visiblePlan, variant: "destructive" });
      return;
    }
    const line_items = [{ price: planPriceId, quantity: 1 }, ...Object.values(addOnLines)];
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", { 
        body: { 
          priceIds: line_items.map(item => item.price),
          planType: visiblePlan,
          addOns: Object.keys(addOnLines)
        }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing");

      // Store session data with more details
      paymentSession.store(data.sessionId, visiblePlan, Object.keys(addOnLines));
      
      // Open Stripe checkout in a new window/tab and store reference
      const newWindow = window.open(data.url, '_blank');
      setStripeWindow(newWindow);
      
      // Set up polling to check payment status
      const intervalId = window.setInterval(() => {
        // Check if stripe window is closed
        if (newWindow?.closed) {
          clearInterval(intervalId);
          setPollInterval(null);
          checkPaymentStatus(data.sessionId);
        }
      }, 1000);
      
      // Store interval ID for cleanup
      setPollInterval(intervalId);
      
      // Also start polling for payment verification
      const paymentIntervalId = window.setInterval(async () => {
        const verified = await checkPaymentStatus(data.sessionId);
        if (verified) {
          clearInterval(paymentIntervalId);
        }
      }, 3000);
      
      // Close the checkout modal after opening Stripe in new window
      close();
      
      toast({ 
        title: "Checkout Opened", 
        description: "Complete your payment in the new tab. This page will automatically update when payment is complete.",
      });
      
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

  return (
    <CheckoutContext.Provider value={{ begin, addOnLines, toggleAddOn, close, visiblePlan }}>
      {children}
      {visiblePlan && (
        <Sheet open={!!visiblePlan} onOpenChange={(open) => !open && close()}>
          <SheetContent className="w-[420px] overflow-y-auto bg-white">
            <SheetHeader>
              <SheetTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Customize Your {visiblePlan} Plan
              </SheetTitle>
            </SheetHeader>

            {visiblePlan === "Professional" ? (
              <p className="mb-8 text-gray-600 text-lg">
                You've selected our most comprehensive plan with all premium features included.
              </p>
            ) : (
              <>
                <p className="mt-8 mb-6 text-xl font-medium text-primary/90">
                  Supercharge your experience with these powerful add-ons:
                </p>
                <div className="space-y-4">
                  {visiblePlan === "Starter" && ["Transits", "Yearly Cycle", "Relationship Compatibility"].map(
                    (addOn) => (
                      <AddOnToggle key={addOn} label={addOn} />
                    )
                  )}
                  {visiblePlan === "Growth" && (
                    <AddOnToggle label="Relationship Compatibility" />
                  )}
                </div>
              </>
            )}

            <SheetFooter className="mt-10 flex-col">
              <Button
                disabled={loading}
                className="w-full py-6 text-lg bg-primary hover:bg-primary/90 transition-colors"
                onClick={continueToStripe}
              >
                {loading ? "Redirecting…" : "Proceed to Checkout"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="mt-2 w-full hover:bg-gray-100"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </CheckoutContext.Provider>
  );

  function AddOnToggle({ label }: { label: string }) {
    const { addOnLines, toggleAddOn } = useCheckoutWizard();
    const checked = !!addOnLines[label];
    
    const displayName = {
      'Transits': 'Transits',
      'Yearly Cycle': 'Yearly Cycle',
      'Relationship Compatibility': 'Relationship Compatibility',
      'relationship compatibility': 'Relationship Compatibility'
    }[label] || label;

    return (
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-sm">
        <div className="space-y-2">
          <span className="text-lg font-semibold text-primary">{displayName}</span>
          <p className="text-sm text-gray-600">Enhance your analytics with advanced insights and predictive features.</p>
        </div>
        <input
          type="checkbox"
          className="h-6 w-6 rounded-md accent-primary"
          checked={checked}
          onChange={() => toggleAddOn(label)}
        />
      </label>
    );
  }
};

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
      <div>
        <h3 className="text-2xl font-bold text-primary mb-2">{name}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
      <p className="text-3xl font-medium text-primary">{price}</p>

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
  name: React.ReactNode;
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
  const wizard = useCheckoutWizard();
  const planNameString = typeof name === 'string' ? name : 
                         React.isValidElement(name) && name.props.children ? name.props.children : 
                         'Plan';
  
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-primary ring-1 ring-primary/20" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 p-6">
        {icon && <span className="text-2xl">{icon}</span>}
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
        <Button className="w-full py-6" onClick={() => wizard.begin(planNameString)}>
          {cta}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutProvider;
