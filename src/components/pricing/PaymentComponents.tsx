
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <h3 className="text-xl font-bold text-primary">{name}</h3>
      <p className="text-gray-600">{description}</p>
      <p className="text-xl font-medium text-primary">{price}</p>

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

// Add the missing PricingPlan component
interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon?: string;
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
  return (
    <div
      className={`flex flex-col rounded-xl border p-8 ${
        highlight
          ? "border-primary bg-primary/5 shadow-md"
          : "border-gray-100 bg-white shadow-sm"
      }`}
    >
      {icon && <div className="mb-4 text-3xl">{icon}</div>}
      <h3 className="text-2xl font-bold text-primary">{name}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
      <p className="my-6 text-3xl font-bold text-primary">{price}</p>
      <Button
        className={`mb-8 ${
          highlight ? "bg-primary hover:bg-primary/90" : "bg-gray-800 hover:bg-gray-700"
        }`}
      >
        {cta}
      </Button>
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Add the CheckoutProvider component
interface CheckoutProviderProps {
  children: React.ReactNode;
}

export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({ children }) => {
  // This is just a simple wrapper component for now
  // In a real implementation, this would contain checkout logic
  return <>{children}</>;
};
