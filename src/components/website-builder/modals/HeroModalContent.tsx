
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "../ImageUploader";

interface HeroModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const HeroModalContent: React.FC<HeroModalContentProps> = ({
  customizationData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="coachName">Your Name</Label>
        <Input
          id="coachName"
          value={customizationData.coachName || ''}
          onChange={(e) => onChange('coachName', e.target.value)}
          placeholder="Enter your name"
        />
      </div>
      
      <div>
        <Label htmlFor="tagline">Tagline</Label>
        <Textarea
          id="tagline"
          value={customizationData.tagline || ''}
          onChange={(e) => onChange('tagline', e.target.value)}
          placeholder="Your professional tagline"
          rows={2}
        />
      </div>
      
      <div>
        <Label htmlFor="buttonText">Button Text</Label>
        <Input
          id="buttonText"
          value={customizationData.buttonText || ''}
          onChange={(e) => onChange('buttonText', e.target.value)}
          placeholder="Call to action text"
        />
      </div>
      
      <div>
        <Label>Header Background Image</Label>
        <ImageUploader
          currentImage={customizationData.headerImageData?.url || customizationData.headerImageUrl}
          onImageChange={(imageData) => onChange('headerImageData', imageData)}
          onImageRemove={() => {
            onChange('headerImageData', null);
            onChange('headerImageUrl', '');
          }}
          folder="header"
          aspectRatio="16:9"
        />
      </div>
    </div>
  );
};
