
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";

interface TemplatePreviewProps {
  template: any;
  customizationData: any;
  isFullScreen?: boolean;
  onClose?: () => void;
}

export const TemplatePreview = ({ 
  template, 
  customizationData, 
  isFullScreen = false, 
  onClose 
}: TemplatePreviewProps) => {
  const renderTemplate = () => {
    const templateType = template?.template_data?.layout || 'modern';
    
    switch (templateType) {
      case 'modern':
        return <ModernTemplate customizationData={customizationData} />;
      case 'classic':
        return <ClassicTemplate customizationData={customizationData} />;
      case 'minimal':
        return <MinimalTemplate customizationData={customizationData} />;
      case 'creative':
        return <CreativeTemplate customizationData={customizationData} />;
      case 'professional':
        return <ProfessionalTemplate customizationData={customizationData} />;
      default:
        return <ModernTemplate customizationData={customizationData} />;
    }
  };

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="bg-white shadow-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-full overflow-auto">
          {renderTemplate()}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
      <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="text-xs text-gray-500">Preview</div>
      </div>
      
      <div className="h-96 overflow-auto">
        <div className="transform scale-50 origin-top-left w-[200%] h-[200%]">
          {renderTemplate()}
        </div>
      </div>
    </div>
  );
};
