import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";

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
  // Enhanced template data with distinct designs
  const enhancedTemplates = [
    {
      id: "modern",
      name: "Modern",
      description: "Clean, contemporary design with bold typography and asymmetric layouts",
      template_data: { layout: 'modern', colorScheme: 'modern' },
      preview: {
        colors: ["#6366F1", "#3B82F6", "#1E40AF"],
      }
    },
    {
      id: "classic",
      name: "Classic",
      description: "Timeless design with elegant typography and traditional layouts",
      template_data: { layout: 'classic', colorScheme: 'elegant' },
      preview: {
        colors: ["#8B5CF6", "#A855F7", "#7C3AED"],
      }
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Ultra-clean design focusing on simplicity and whitespace",
      template_data: { layout: 'minimal', colorScheme: 'minimal' },
      preview: {
        colors: ["#10B981", "#059669", "#047857"],
      }
    },
    {
      id: "creative",
      name: "Creative",
      description: "Bold, artistic design with vibrant colors and dynamic elements",
      template_data: { layout: 'creative', colorScheme: 'vibrant' },
      preview: {
        colors: ["#F59E0B", "#EC4899", "#8B5CF6"],
      }
    },
    {
      id: "professional",
      name: "Professional",
      description: "Corporate-focused design with structured layouts and business appeal",
      template_data: { layout: 'professional', colorScheme: 'corporate' },
      preview: {
        colors: ["#1E40AF", "#3B82F6", "#60A5FA"],
      }
    }
  ];

  const getTemplateComponent = (template: any) => {
    const templateType = template.template_data?.layout || 'modern';
    const defaultCustomizationData = {
      coachName: 'Coach Name',
      tagline: 'Transform Your Life',
      bio: 'Professional coaching services to help you achieve your goals.',
      services: [
        { title: 'Life Coaching', description: '1-on-1 sessions', price: '$150/session' },
        { title: 'Career Coaching', description: 'Career guidance', price: '$120/session' }
      ],
      buttonText: 'Book Now',
      themeColor: template.preview.colors[0],
      fontFamily: 'Inter',
      backgroundStyle: 'solid'
    };

    // Add isPreview={true} for all template renders in selection mode
    switch (templateType) {
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
      default:
        return <ModernTemplate customizationData={defaultCustomizationData} isPreview={true} />;
    }
  };

  // Update: Remove all fixed heights (h-80, h-72), let container grow with content, scale to 50%.
  const getLivePreview = (template: any) => {
    return (
      <div 
        className="w-full rounded-lg border bg-white shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
        onClick={() => onSelectTemplate(template)}
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

        {/* Responsive Template Preview - scale to 50% for good fit */}
        <div className="flex justify-center items-start bg-white py-4">
          <div className="transform scale-50 origin-top w-[200%]">
            {getTemplateComponent(template)}
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
            key={template.id}
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
                    {template.template_data?.layout}
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
