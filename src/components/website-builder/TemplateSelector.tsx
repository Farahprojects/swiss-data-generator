
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
        hero: "Split layout with large typography",
        colors: ["#6366F1", "#3B82F6", "#1E40AF"],
        style: "Contemporary with smooth animations"
      }
    },
    {
      id: "classic",
      name: "Classic",
      description: "Timeless design with elegant typography and traditional layouts",
      template_data: { layout: 'classic', colorScheme: 'elegant' },
      preview: {
        hero: "Centered with traditional elegance",
        colors: ["#8B5CF6", "#A855F7", "#7C3AED"],
        style: "Traditional with refined details"
      }
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Ultra-clean design focusing on simplicity and whitespace",
      template_data: { layout: 'minimal', colorScheme: 'minimal' },
      preview: {
        hero: "Minimal with maximum impact",
        colors: ["#10B981", "#059669", "#047857"],
        style: "Clean and distraction-free"
      }
    },
    {
      id: "creative",
      name: "Creative",
      description: "Bold, artistic design with vibrant colors and dynamic elements",
      template_data: { layout: 'creative', colorScheme: 'vibrant' },
      preview: {
        hero: "Dynamic with artistic flair",
        colors: ["#F59E0B", "#EC4899", "#8B5CF6"],
        style: "Bold and imaginative"
      }
    },
    {
      id: "professional",
      name: "Professional",
      description: "Corporate-focused design with structured layouts and business appeal",
      template_data: { layout: 'professional', colorScheme: 'corporate' },
      preview: {
        hero: "Corporate with credibility focus",
        colors: ["#1E40AF", "#3B82F6", "#60A5FA"],
        style: "Professional and trustworthy"
      }
    }
  ];

  const getTemplatePreview = (template: any) => {
    return (
      <div className="w-full h-64 rounded-lg border overflow-hidden bg-gray-50 relative group">
        {/* Hero Section Preview */}
        <div 
          className="h-20 flex items-center px-4 relative"
          style={{ 
            background: template.template_data?.layout === 'creative' 
              ? `linear-gradient(135deg, ${template.preview.colors[0]}, ${template.preview.colors[1]})` 
              : template.preview.colors[0] 
          }}
        >
          <div className="w-24 h-4 bg-white bg-opacity-80 rounded"></div>
          {template.template_data?.layout === 'professional' && (
            <div className="ml-auto flex space-x-2">
              <div className="w-10 h-2 bg-white bg-opacity-60 rounded"></div>
              <div className="w-10 h-2 bg-white bg-opacity-60 rounded"></div>
              <div className="w-10 h-2 bg-white bg-opacity-60 rounded"></div>
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div className="p-4 space-y-4 bg-white">
          {template.template_data?.layout === 'minimal' ? (
            <div className="text-center space-y-3">
              <div className="w-20 h-3 bg-gray-800 rounded mx-auto"></div>
              <div className="w-2 h-6 bg-gray-400 mx-auto"></div>
              <div className="w-32 h-2 bg-gray-300 rounded mx-auto"></div>
              <div className="w-16 h-4 bg-gray-200 rounded mx-auto"></div>
            </div>
          ) : template.template_data?.layout === 'classic' ? (
            <div className="text-center space-y-3">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mx-auto"></div>
              <div className="w-24 h-3 bg-gray-800 rounded mx-auto"></div>
              <div className="w-16 h-1 bg-amber-500 mx-auto"></div>
              <div className="w-36 h-2 bg-gray-300 rounded mx-auto"></div>
              <div className="w-20 h-4 bg-purple-600 rounded mx-auto"></div>
            </div>
          ) : template.template_data?.layout === 'creative' ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 bg-gradient-to-br from-yellow-300 to-orange-400 rounded transform rotate-3"></div>
              <div className="h-10 bg-gradient-to-br from-purple-300 to-pink-400 rounded transform -rotate-2 mt-1"></div>
              <div className="h-11 bg-gradient-to-br from-blue-300 to-teal-400 rounded transform rotate-1"></div>
            </div>
          ) : template.template_data?.layout === 'professional' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="w-full h-3 bg-gray-800 rounded mb-2"></div>
                <div className="w-3/4 h-2 bg-gray-400 rounded mb-3"></div>
                <div className="w-16 h-4 bg-blue-600 rounded"></div>
              </div>
              <div className="bg-blue-50 rounded p-3 grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="w-full h-3 bg-blue-600 rounded mb-1"></div>
                  <div className="w-full h-1 bg-blue-300 rounded"></div>
                </div>
                <div className="text-center">
                  <div className="w-full h-3 bg-blue-600 rounded mb-1"></div>
                  <div className="w-full h-1 bg-blue-300 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="w-full h-4 bg-gray-800 rounded mb-3"></div>
                <div className="w-3/4 h-2 bg-gray-400 rounded mb-3"></div>
                <div className="flex space-x-2">
                  <div className="w-12 h-4 bg-blue-600 rounded"></div>
                  <div className="w-12 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded h-20"></div>
            </div>
          )}
        </div>

        {/* Services Preview */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="h-10 bg-gray-100 rounded flex items-center justify-center"
                style={{ backgroundColor: `${template.preview.colors[0]}20` }}
              >
                <div className="w-6 h-2 rounded" style={{ backgroundColor: template.preview.colors[0] }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-sm font-medium">Preview Template</div>
            <div className="text-xs opacity-80">{template.preview.style}</div>
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
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 overflow-hidden">
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
              
              <CardContent className="space-y-6">
                {getTemplatePreview(template)}
                
                <Button 
                  onClick={() => onSelectTemplate(template)}
                  className="w-full group-hover:bg-blue-600 transition-colors text-lg py-6 font-medium"
                  style={{ backgroundColor: template.preview.colors[0] }}
                >
                  Select {template.name} Template
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
