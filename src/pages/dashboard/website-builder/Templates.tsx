
import React from "react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplateSelector } from "@/components/website-builder/TemplateSelector";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Templates() {
  const { templates, selectedTemplate, setSelectedTemplate, isLoading, customizationData } = useWebsiteBuilder();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Template</h2>
        <p className="text-gray-600">Select a template that best represents your coaching style</p>
      </div>
      
      <TemplateSelector 
        templates={templates}
        onSelectTemplate={setSelectedTemplate}
        selectedTemplate={selectedTemplate}
      />
      
      {selectedTemplate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Selected: {selectedTemplate.name}</h3>
            <Button 
              onClick={() => navigate('/dashboard/website-builder/content')}
              className="flex items-center space-x-2"
            >
              <span>Continue to Content</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="lg:hidden">
            <TemplatePreview
              template={selectedTemplate}
              customizationData={customizationData}
            />
          </div>
        </div>
      )}
      
      {/* Live preview for desktop - will be positioned in the right column by the layout */}
      <div className="hidden lg:block lg:fixed lg:top-24 lg:right-6 lg:w-96">
        {selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            customizationData={customizationData}
          />
        )}
      </div>
    </div>
  );
}
