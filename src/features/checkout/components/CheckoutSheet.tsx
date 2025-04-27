
import React from "react";
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
import { useCheckout } from "../hooks/useCheckout";
import { AddOnToggle } from "./AddOnToggle";

interface CheckoutSheetProps {
  visiblePlan?: string;
  onClose: () => void;
}

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  visiblePlan,
  onClose,
}) => {
  const { addOnLines, toggleAddOn, continueToStripe, loading } = useCheckout();

  return (
    <Sheet open={!!visiblePlan} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] overflow-y-auto bg-white">
        <SheetHeader>
          <SheetTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Customize Your {visiblePlan} Plan
          </SheetTitle>
        </SheetHeader>
        
        {/* Add-on toggles */}
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
  );
};
