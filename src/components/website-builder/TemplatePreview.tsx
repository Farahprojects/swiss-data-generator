
import React from 'react';
import { ClassicTemplate } from './templates/ClassicTemplate';
import { ModernTemplate } from './templates/ModernTemplate';
import { MinimalTemplate } from './templates/MinimalTemplate';
import { CreativeTemplate } from './templates/CreativeTemplate';
import { ProfessionalTemplate } from './templates/ProfessionalTemplate';

interface TemplatePreviewProps {
  template: any;
  customizationData: any;
  onCustomizationChange?: (field: string, value: any) => void;
  isPublicView?: boolean;
}

const templateComponents = {
  'Classic': ClassicTemplate,
  'Modern': ModernTemplate,
  'Minimal': MinimalTemplate,
  'Creative': CreativeTemplate,
  'Professional': ProfessionalTemplate,
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  customizationData,
  onCustomizationChange,
  isPublicView = false
}) => {
  const TemplateComponent = templateComponents[template.name as keyof typeof templateComponents];

  if (!TemplateComponent) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500">Template not found: {template.name}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden h-[600px]">
      <div className="h-full overflow-y-auto">
        <TemplateComponent 
          customizationData={customizationData} 
          isPreview={true}
          onCustomizationChange={!isPublicView ? onCustomizationChange : undefined}
        />
      </div>
    </div>
  );
};
