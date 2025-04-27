
import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AddonCardProps {
  name: string;
  price: string;
  description: string;
  details: string[];
  isSelected: boolean;
  onToggle: () => void;
}

export const AddonCard: React.FC<AddonCardProps> = ({
  name,
  price,
  description,
  details,
  isSelected,
  onToggle,
}) => {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isSelected ? "border-primary ring-1 ring-primary/20" : "border-gray-200"
      )}
    >
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-primary">{name}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <div className="text-xl font-semibold text-primary">{price}</div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-1 h-4 w-4 text-primary" />
              <span className="text-sm text-gray-700">{detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          onClick={onToggle}
        >
          {isSelected ? "Remove" : "Add"}
        </Button>
      </CardFooter>
    </Card>
  );
};
