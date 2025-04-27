
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCheckout } from "../hooks/useCheckout";
import { AddOnToggle } from "./AddOnToggle";
import { addOns } from "@/utils/pricing";

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  planName?: string;
}

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  open,
  onClose,
  title = "Complete Your Purchase",
  planName,
}) => {
  const { continueToStripe, loading } = useCheckout();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Selected Plan: {planName}</h3>
          
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-medium">Add-ons (Optional)</h3>
            <div className="space-y-4">
              {addOns.map((addon) => (
                <AddOnToggle key={addon.name} label={addon.name} />
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col space-y-4">
            <Button
              onClick={() => continueToStripe()}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Processing..." : "Continue to Checkout"}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
