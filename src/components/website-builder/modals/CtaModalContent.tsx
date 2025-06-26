
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CtaModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const CtaModalContent: React.FC<CtaModalContentProps> = ({
  customizationData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="footerHeading">CTA Heading</Label>
        <Input
          id="footerHeading"
          value={customizationData.footerHeading || ''}
          onChange={(e) => onChange('footerHeading', e.target.value)}
          placeholder="Ready to begin?"
        />
      </div>
      
      <div>
        <Label htmlFor="footerSubheading">CTA Subheading</Label>
        <Textarea
          id="footerSubheading"
          value={customizationData.footerSubheading || ''}
          onChange={(e) => onChange('footerSubheading', e.target.value)}
          placeholder="Your personalized insights are just a few clicks away."
          rows={2}
        />
      </div>
    </div>
  );
};
