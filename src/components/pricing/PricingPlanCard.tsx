
import React from "react";
import { Check } from "lucide-react";

interface PricingPlanProps {
  name: React.ReactNode;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  icon?: React.ReactNode;
}

export const PricingPlanCard: React.FC<PricingPlanProps> = ({
  name,
  price,
  description,
  features,
  highlight = false,
  icon,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-primary ring-1 ring-primary/20" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 p-6 bg-primary">
        {icon && <span className="text-2xl text-white">{icon}</span>}
        <div>
          <h3 className="text-xl font-bold text-white">{name}</h3>
          <p className="text-white/90">{description}</p>
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
      </div>
    </div>
  );
};
