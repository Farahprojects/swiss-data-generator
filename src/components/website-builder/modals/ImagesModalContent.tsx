
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImagesModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const ImagesModalContent: React.FC<ImagesModalContentProps> = ({
  customizationData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="themeColor">Theme Color</Label>
        <Input
          id="themeColor"
          type="color"
          value={customizationData.themeColor || '#3B82F6'}
          onChange={(e) => onChange('themeColor', e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="fontFamily">Font Family</Label>
        <Select
          value={customizationData.fontFamily || 'Inter'}
          onValueChange={(value) => onChange('fontFamily', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Playfair Display">Playfair Display</SelectItem>
            <SelectItem value="Roboto">Roboto</SelectItem>
            <SelectItem value="Open Sans">Open Sans</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="buttonColor">Button Color</Label>
        <Input
          id="buttonColor"
          type="color"
          value={customizationData.buttonColor || customizationData.themeColor || '#3B82F6'}
          onChange={(e) => onChange('buttonColor', e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="buttonTextColor">Button Text Color</Label>
        <Input
          id="buttonTextColor"
          type="color"
          value={customizationData.buttonTextColor || '#FFFFFF'}
          onChange={(e) => onChange('buttonTextColor', e.target.value)}
        />
      </div>
    </div>
  );
};
