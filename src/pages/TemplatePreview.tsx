
import { useSearchParams } from "react-router-dom";
import { ModernTemplate } from "@/components/website-builder/templates/ModernTemplate";
import { ClassicTemplate } from "@/components/website-builder/templates/ClassicTemplate";
import { MinimalTemplate } from "@/components/website-builder/templates/MinimalTemplate";
import { CreativeTemplate } from "@/components/website-builder/templates/CreativeTemplate";
import { ProfessionalTemplate } from "@/components/website-builder/templates/ProfessionalTemplate";

export default function TemplatePreview() {
  const [searchParams] = useSearchParams();
  
  const templateType = searchParams.get('template') || 'modern';
  const customizationDataParam = searchParams.get('data');
  
  let customizationData = {};
  if (customizationDataParam) {
    try {
      customizationData = JSON.parse(decodeURIComponent(customizationDataParam));
    } catch (error) {
      console.error('Error parsing customization data:', error);
    }
  }

  const renderTemplate = () => {
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

  return (
    <div className="w-full">
      {renderTemplate()}
    </div>
  );
}
