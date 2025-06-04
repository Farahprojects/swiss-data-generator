
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

  const getRealisticPreview = (template: any) => {
    const colors = template.preview.colors;
    const layout = template.template_data?.layout;

    return (
      <div className="w-full h-80 rounded-lg border overflow-hidden bg-white relative group shadow-sm">
        {/* Website Header */}
        <div className="h-12 bg-white border-b flex items-center px-4 justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: colors[0] }}></div>
            <div className="hidden sm:flex space-x-4">
              <div className="w-12 h-2 bg-gray-300 rounded"></div>
              <div className="w-16 h-2 bg-gray-300 rounded"></div>
              <div className="w-14 h-2 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="w-16 h-6 rounded" style={{ backgroundColor: colors[0] }}></div>
        </div>

        {/* Hero Section based on layout */}
        {layout === 'modern' && (
          <div className="h-40 relative" style={{ background: `linear-gradient(135deg, ${colors[2]}, ${colors[0]})` }}>
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            <div className="relative z-10 p-6 text-white">
              <div className="grid grid-cols-2 gap-6 h-full">
                <div className="flex flex-col justify-center">
                  <div className="w-24 h-4 bg-white bg-opacity-90 rounded mb-3"></div>
                  <div className="w-16 h-2 bg-white bg-opacity-60 rounded mb-4"></div>
                  <div className="w-12 h-3 bg-white rounded"></div>
                </div>
                <div className="relative">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {layout === 'classic' && (
          <div className="h-40 bg-gradient-to-b from-gray-50 to-white">
            <div className="text-center pt-8 px-6">
              <div className="w-8 h-8 rounded-full mx-auto mb-4" style={{ background: `linear-gradient(45deg, ${colors[0]}, ${colors[1]})` }}></div>
              <div className="w-32 h-4 bg-gray-800 rounded mx-auto mb-3"></div>
              <div className="w-2 h-6 mx-auto mb-4" style={{ backgroundColor: colors[0] }}></div>
              <div className="w-40 h-2 bg-gray-400 rounded mx-auto mb-4"></div>
              <div className="w-20 h-6 rounded mx-auto" style={{ backgroundColor: colors[0] }}></div>
            </div>
          </div>
        )}

        {layout === 'minimal' && (
          <div className="h-40 bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="w-28 h-5 bg-gray-900 rounded mx-auto mb-6"></div>
              <div className="w-1 h-8 bg-gray-900 mx-auto mb-6"></div>
              <div className="w-36 h-2 bg-gray-400 rounded mx-auto mb-6"></div>
              <div className="w-16 h-6 border border-gray-900 rounded mx-auto"></div>
            </div>
          </div>
        )}

        {layout === 'creative' && (
          <div className="h-40 relative overflow-hidden" style={{ background: `linear-gradient(45deg, ${colors[0]}, ${colors[1]})` }}>
            <div className="absolute inset-0">
              <div className="absolute top-4 left-4 w-12 h-12 rounded-full opacity-80" style={{ backgroundColor: colors[2] }}></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white opacity-60"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="text-center text-white">
                  <div className="w-24 h-5 bg-white bg-opacity-90 rounded mx-auto mb-3"></div>
                  <div className="w-16 h-2 bg-white bg-opacity-70 rounded mx-auto mb-4"></div>
                  <div className="w-14 h-4 bg-white rounded mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {layout === 'professional' && (
          <div className="h-40" style={{ backgroundColor: colors[0] }}>
            <div className="grid grid-cols-3 h-full">
              <div className="col-span-2 p-6 text-white">
                <div className="w-32 h-4 bg-white bg-opacity-90 rounded mb-3"></div>
                <div className="w-24 h-2 bg-white bg-opacity-60 rounded mb-4"></div>
                <div className="w-16 h-4 bg-white rounded"></div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                    <div className="w-8 h-1 bg-white rounded"></div>
                  </div>
                  <div className="h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                    <div className="w-8 h-1 bg-white rounded"></div>
                  </div>
                  <div className="h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                    <div className="w-8 h-1 bg-white rounded"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-10 p-4 flex items-center justify-center">
                <div className="w-16 h-16 bg-white bg-opacity-30 rounded"></div>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-3 bg-white flex-1">
          <div className="flex justify-between items-center">
            <div className="w-20 h-3 bg-gray-800 rounded"></div>
            <div className="w-12 h-2 bg-gray-300 rounded"></div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-12 bg-gray-100 rounded"></div>
                <div className="w-full h-1.5 bg-gray-300 rounded"></div>
                <div className="w-3/4 h-1 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="h-8 border-t bg-gray-50 flex items-center justify-center">
          <div className="w-24 h-1.5 bg-gray-300 rounded"></div>
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
                {getRealisticPreview(template)}
                
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
