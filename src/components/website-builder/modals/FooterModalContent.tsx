
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FooterModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const FooterModalContent: React.FC<FooterModalContentProps> = ({
  customizationData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="coachName">Footer Name</Label>
        <Input
          id="coachName"
          value={customizationData.coachName || ''}
          onChange={(e) => onChange('coachName', e.target.value)}
          placeholder="Your Name"
        />
      </div>
      
      <div>
        <Label>Footer tagline is automatically set to: "Personalized insights for your unique journey"</Label>
        <p className="text-sm text-gray-500 mt-1">
          This provides consistency across your website footer.
        </p>
      </div>
    </div>
  );
};
