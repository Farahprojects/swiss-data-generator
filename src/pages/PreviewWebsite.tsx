
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TheraLoader } from "@/components/ui/TheraLoader";

export default function PreviewWebsite() {
  const { previewId } = useParams<{ previewId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [customizationData, setCustomizationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreviewData();
  }, [previewId]);

  const loadPreviewData = () => {
    if (!previewId) {
      setIsLoading(false);
      return;
    }

    try {
      // Load data from localStorage using the preview ID
      const storedData = localStorage.getItem(`preview-${previewId}`);
      
      if (storedData) {
        const { template: templateData, customizationData: customData } = JSON.parse(storedData);
        setTemplate(templateData);
        setCustomizationData(customData);
      }
    } catch (error) {
      console.error('Error loading preview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TheraLoader message="Loading preview..." size="lg" />
      </div>
    );
  }

  if (!template || !customizationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Not Found</h1>
          <p className="text-gray-600 mb-6">
            The preview you're looking for doesn't exist or has expired.
          </p>
          <Button
            onClick={() => window.close()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Close Window</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold">Preview: {template.name}</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.close()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Close</span>
        </Button>
      </div>
      <TemplatePreview
        template={template}
        customizationData={customizationData}
        isPublicView={true}
      />
    </div>
  );
}
