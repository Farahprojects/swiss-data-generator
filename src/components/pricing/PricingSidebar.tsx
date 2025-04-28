
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingSidebar({ open, onOpenChange }: PricingSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader className="mb-8">
          <SheetTitle>Start Your Free Trial</SheetTitle>
          <SheetDescription>
            Try all features free for 14 days. No credit card required.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">What's included:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Full API access</li>
              <li>• 100,000 API calls</li>
              <li>• Priority support</li>
              <li>• All add-ons included</li>
            </ul>
          </div>

          <Link to="/signup">
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
