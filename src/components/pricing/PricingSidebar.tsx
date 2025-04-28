
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingSidebar({ open, onOpenChange }: PricingSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl">Start Your Free Trial</SheetTitle>
          <SheetDescription>
            Try all features free for 14 days. No credit card required.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What's included:</h3>
            <ul className="space-y-3">
              {[
                "Full API access",
                "100,000 API calls",
                "Priority support",
                "All add-ons included",
                "Developer documentation",
                "Integration examples"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Your free trial gives you full access to all features for 14 days. 
              After your trial ends, you can choose to subscribe to any plan.
            </p>
          </div>

          <Link to="/signup" className="block w-full">
            <Button className="w-full gap-2">
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
