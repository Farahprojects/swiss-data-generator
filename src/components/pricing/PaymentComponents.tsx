
import React, { useState, createContext, useContext } from "react";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { useAuth } from "@/contexts/AuthContext";

/*───────────────────────────────────────────────────────────────────
  Checkout context  →  lets Pricing page open an upsell drawer first
───────────────────────────────────────────────────────────────────*/
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

/*───────────────────────────────────────────────────────────────────
  Provider wraps Pricing page
───────────────────────────────────────────────────────────────────*/
export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [visiblePlan, setVisiblePlan] = useState<string>();
  const [addOnLines, setAddOnLines] = useState<Record<string, LineItem>>({});
  const [loading, setLoading] = useState(false);

  const toggleAddOn = (name: string) =>
    setAddOnLines((prev) =>
      prev[name] ? (() => { const p = { ...prev }; delete p[name]; return p; })() : { ...prev, [name]: { price: getPriceId(name), quantity: 1 } },
    );

  const begin = (planName: string) => {
    setVisiblePlan(planName);
    setAddOnLines({});
  };

  const close = () => setVisiblePlan(undefined);

  const continueToStripe = async () => {
    if (!visiblePlan) return;
    const planPriceId = getPriceId(visiblePlan);
    if (!planPriceId) {
      toast({ title: "Price mapping missing", description: visiblePlan, variant: "destructive" });
      return;
    }
    const line_items: LineItem[] = [{ price: planPriceId, quantity: 1 }, ...Object.values(addOnLines)];
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { line_items } });
      if (error) throw error;
      if (!data?.url) throw new Error("Stripe URL missing");
      /* make sure we exit any iframe */
      if (window.top && window.top !== window.self) {
        window.top.location.assign(data.url);
      } else {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <CheckoutContext.Provider
      value={{ begin, addOnLines, toggleAddOn, close, visiblePlan }}
    >
      {children}
      {/* ── Using Sheet for side panel ───────────────────────────────── */}
      {visiblePlan && (
        <Sheet open={!!visiblePlan} onOpenChange={(open) => !open && close()}>
          <SheetContent className="w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">Confirm Your {visiblePlan} Plan</SheetTitle>
            </SheetHeader>
            
            {/* Add-on toggles */}
            {visiblePlan === "Professional" ? (
              <p className="mb-8 text-gray-600">
                Professional already includes every feature and add-on.
              </p>
            ) : (
              <>
                <p className="mt-6 mb-4 text-gray-600">Enhance your plan:</p>
                <div className="space-y-4">
                  {visiblePlan === "Starter" && ["Daily Transits", "Yearly Cycle", "Relationship Compatibility"].map(
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
                className="w-full py-6"
                onClick={continueToStripe}
              >
                {loading ? "Redirecting…" : "Proceed to Checkout"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
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

  /*------------------------------------*/
  function AddOnToggle({ label }: { label: string }) {
    const checked = !!addOnLines[label];
    return (
      <label className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-sm">
        <span>{label}</span>
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={checked}
          onChange={() => toggleAddOn(label)}
        />
      </label>
    );
  }
};

/*───────────────────────────────────────────────────────────────────
  Presentational components
───────────────────────────────────────────────────────────────────*/
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
  const wizard = useCheckoutWizard();
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
        <Button className="w-full py-6" onClick={() => wizard.begin(name)}>
          {cta}
        </Button>
      </div>
    </div>
  );
};
