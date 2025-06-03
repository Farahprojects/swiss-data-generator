
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const getTemplatePreview = (template: WebsiteTemplate) => {
    const layout = template.template_data?.layout || 'classic';
    const colorScheme = template.template_data?.colorScheme || 'professional';
    
    // Define color schemes
    const colors = {
      professional: { primary: '#1e40af', secondary: '#f3f4f6', accent: '#3b82f6' },
      modern: { primary: '#111827', secondary: '#f9fafb', accent: '#6366f1' },
      minimal: { primary: '#374151', secondary: '#ffffff', accent: '#9ca3af' },
      elegant: { primary: '#1f2937', secondary: '#f8fafc', accent: '#8b5cf6' },
      warm: { primary: '#92400e', secondary: '#fef7ed', accent: '#f59e0b' }
    };

    const schemeColors = colors[colorScheme as keyof typeof colors] || colors.professional;

    return (
      <div className="w-full h-40 rounded-md border overflow-hidden bg-white">
        <div 
          className="h-12 flex items-center px-4"
          style={{ backgroundColor: schemeColors.primary }}
        >
          <div className="w-16 h-4 bg-white bg-opacity-80 rounded"></div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="w-24 h-3 bg-gray-300 rounded"></div>
            <div className="w-32 h-2 bg-gray-200 rounded"></div>
          </div>
          <div className="flex space-x-2">
            <div className="w-16 h-6 bg-gray-100 rounded"></div>
            <div className="w-16 h-6 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Template</h2>
        <p className="text-gray-600">Select a template that matches your coaching style</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {template.template_data?.layout || 'Layout'}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {getTemplatePreview(template)}
              
              <Button 
                onClick={() => onSelectTemplate(template)}
                className="w-full group-hover:bg-blue-600 transition-colors"
              >
                Select Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
