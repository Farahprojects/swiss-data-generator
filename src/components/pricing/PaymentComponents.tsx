
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

