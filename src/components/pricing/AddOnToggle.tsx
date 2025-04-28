
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface AddOnToggleProps {
  label: string;
  price: string;
  description: string;
  details: string[];
}

export const AddOnToggle: React.FC<AddOnToggleProps> = ({ label, price, description, details }) => {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 p-6">
        <div>
          <h3 className="text-xl font-bold">{label}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>

      <div className="px-6">
        {details.map((detail, i) => (
          <div key={i} className="flex items-start gap-2 py-1 text-sm text-gray-700">
            <Check className="h-4 w-4 text-primary" />
            <span>{detail}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto p-6 pt-0">
        <p className="mb-4 text-3xl font-semibold text-primary">{price}/month</p>
        <Button 
          className="w-full py-6" 
          onClick={() => alert('Coming soon!')}
        >
          Add to Plan
        </Button>
      </div>
    </div>
  );
};
