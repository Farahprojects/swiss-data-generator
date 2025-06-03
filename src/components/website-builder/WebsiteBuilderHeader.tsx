
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Save } from "lucide-react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplatePreview } from "./TemplatePreview";

export const WebsiteBuilderHeader = () => {
  const { selectedTemplate, customizationData, saveWebsite, isSaving } = useWebsiteBuilder();
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
              {selectedTemplate && (
                <p className="text-gray-600">Template: {selectedTemplate.name}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={!selectedTemplate}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
              
              <Button
                onClick={saveWebsite}
                disabled={isSaving || !selectedTemplate}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          customizationData={customizationData}
          isFullScreen={true}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};
