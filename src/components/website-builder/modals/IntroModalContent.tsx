
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "../ImageUploader";

interface IntroModalContentProps {
  customizationData: any;
  onChange: (field: string, value: any) => void;
}

export const IntroModalContent: React.FC<IntroModalContentProps> = ({
  customizationData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="introTitle">Section Title</Label>
        <Input
          id="introTitle"
          value={customizationData.introTitle || ''}
          onChange={(e) => onChange('introTitle', e.target.value)}
          placeholder="About Me"
        />
      </div>
      
      <div>
        <Label htmlFor="bio">Bio/Description</Label>
        <Textarea
          id="bio"
          value={customizationData.bio || ''}
          onChange={(e) => onChange('bio', e.target.value)}
          placeholder="Tell visitors about yourself..."
          rows={4}
        />
      </div>
      
      <div>
        <Label>About Image</Label>
        <ImageUploader
          currentImage={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
          onImageChange={(imageData) => onChange('aboutImageData', imageData)}
          onImageRemove={() => {
            onChange('aboutImageData', null);
            onChange('aboutImageUrl', '');
          }}
          folder="about"
          aspectRatio="1:1"
        />
      </div>
    </div>
  );
};
