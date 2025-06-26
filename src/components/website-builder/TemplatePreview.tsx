
import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";

interface TemplatePreviewProps {
  template: {
    id: string;
    name: string;
    template_data: any;
  };
  customizationData: any;
  isFullScreen?: boolean;
  isPublicView?: boolean;
  onClose?: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  customizationData,
  isFullScreen = false,
  isPublicView = false,
  onClose
}) => {
  const renderTemplate = () => {
    const templateProps = {
      customizationData: customizationData || {},
      isPreview: !isPublicView
    };

    switch (template.name.toLowerCase()) {
      case 'classic':
        return <ClassicTemplate {...templateProps} />;
      case 'modern':
        return <ModernTemplate {...templateProps} />;
      case 'minimal':
        return <MinimalTemplate {...templateProps} />;
      case 'professional':
        return <ProfessionalTemplate {...templateProps} />;
      case 'creative':
        return <CreativeTemplate {...templateProps} />;
      default:
        return <ClassicTemplate {...templateProps} />;
    }
  };

  if (isFullScreen && !isPublicView) {
    return (
      <div className={`fixed inset-0 bg-white z-50 overflow-auto ${!isPublicView ? 'pt-16' : ''}`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Preview: {template.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-screen">
          {renderTemplate()}
        </div>
      </div>
    );
  }

  if (isPublicView) {
    return (
      <div className="min-h-screen">
        {renderTemplate()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="font-medium text-gray-900">Preview: {template.name}</h3>
      </div>
      <div className="aspect-[4/3] overflow-auto">
        <div className="transform scale-75 origin-top-left w-[133.33%] h-[133.33%]">
          {renderTemplate()}
        </div>
      </div>
    </div>
  );
};
