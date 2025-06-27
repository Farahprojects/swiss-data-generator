import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";
import { AbstractTemplate } from "./templates/AbstractTemplate";
import { getDefaultTemplateData } from "./shared/defaultTemplateData";

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  template_data: any;
}

interface TemplateSelectorProps {
  templates: WebsiteTemplate[];
  onSelectTemplate: (template: WebsiteTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  onSelectTemplate
}) => {
  // Enhanced template data with distinct designs - these map to database templates
  const enhancedTemplates = [
    {
      name: "Modern",
      description: "Clean, contemporary design with bold typography and asymmetric layouts",
      preview: {
        colors: ["#6366F1", "#3B82F6", "#1E40AF"],
      }
    },
    {
      name: "Classic",
      description: "Timeless design with elegant typography and traditional layouts",
      preview: {
        colors: ["#8B5CF6", "#A855F7", "#7C3AED"],
      }
    },
    {
      name: "Minimal",
      description: "Ultra-clean design focusing on simplicity and whitespace",
      preview: {
        colors: ["#10B981", "#059669", "#047857"],
      }
    },
    {
      name: "Creative",
      description: "Bold, artistic design with vibrant colors and dynamic elements",
      preview: {
        colors: ["#F59E0B", "#EC4899", "#8B5CF6"],
      }
    },
    {
      name: "Professional",
      description: "Corporate-focused design with structured layouts and business appeal",
      preview: {
        colors: ["#1E40AF", "#3B82F6", "#60A5FA"],
      }
    },
    {
      name: "Abstract",
      description: "Sophisticated geometric design with artistic elements and morphing shapes",
      preview: {
        colors: ["#6B46C1", "#8B5CF6", "#A855F7"],
      }
    }
  ];

  const getTemplateComponent = (templateName: string) => {
    // Use the shared default data for consistent appearance
    const defaultCustomizationData = getDefaultTemplateData(templateName);

    switch (templateName.toLowerCase()) {
      case 'modern':
        return <ModernTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      case 'classic':
        return <ClassicTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      case 'minimal':
        return <MinimalTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      case 'creative':
        return <CreativeTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      case 'professional':
        return <ProfessionalTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      case 'abstract':
        return <AbstractTemplate customizationData={defaultCustomizationData} isPreview={true} />;
      default:
        return <ModernTemplate customizationData={defaultCustomizationData} isPreview={true} />;
    }
  };

  const handleTemplateSelect = (enhancedTemplate: any) => {
    console.log("Template selected:", enhancedTemplate.name);
    
    // Find the corresponding database template by name
    const dbTemplate = templates.find(t => 
      t.name.toLowerCase() === enhancedTemplate.name.toLowerCase()
    );
    
    if (!dbTemplate) {
      console.error("Database template not found for:", enhancedTemplate.name);
      console.log("Available templates:", templates.map(t => ({ id: t.id, name: t.name })));
      return;
    }
    
    console.log("Found database template:", { id: dbTemplate.id, name: dbTemplate.name });
    onSelectTemplate(dbTemplate);
  };

  const getLivePreview = (enhancedTemplate: any) => {
    return (
      <div 
        className="w-full rounded-lg border bg-white shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
        onClick={() => handleTemplateSelect(enhancedTemplate)}
      >
        {/* Browser Chrome */}
        <div className="h-8 bg-gray-100 border-b flex items-center px-3 space-x-2 rounded-t-lg">
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-gray-500 text-center">
            yoursite.com
          </div>
        </div>

        {/* Scrollable Template Preview */}
        <div className="max-h-72 overflow-auto">
          <div className="w-full">
            {getTemplateComponent(enhancedTemplate.name)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Template</h2>
        <p className="text-lg text-gray-600">Select a template that matches your coaching style and brand personality</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {enhancedTemplates.map((template, index) => (
          <motion.div
            key={template.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl font-bold">{template.name}</CardTitle>
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${template.preview.colors[0]}15`,
                      color: template.preview.colors[0]
                    }}
                  >
                    {template.name.toLowerCase()}
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {getLivePreview(template)}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
