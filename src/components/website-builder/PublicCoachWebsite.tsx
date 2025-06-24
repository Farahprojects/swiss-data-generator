import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TemplatePreview } from "./TemplatePreview";
import { TheraLoader } from "@/components/ui/TheraLoader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WebsiteErrorBoundary } from "./WebsiteErrorBoundary";

interface CoachWebsite {
  id: string;
  template_id: string;
  customization_data: any;
  is_published: boolean;
}

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  template_data: any;
}

// Helper function to validate and clean customization data
const validateCustomizationData = (data: any) => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  // Clean services array to remove null values
  if (data.services && Array.isArray(data.services)) {
    data.services = data.services.filter((service: any) => 
      service && typeof service === 'object' && service !== null
    );
  }

  return data;
};

export const PublicCoachWebsite: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [website, setWebsite] = useState<CoachWebsite | null>(null);
  const [template, setTemplate] = useState<WebsiteTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadWebsite();
  }, [slug]);

  const loadWebsite = async () => {
    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading website for slug:', slug);
      
      // Query coach_websites for a published website with this slug
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('*')
        .eq('site_slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (websiteError) {
        console.error('Website query error:', websiteError);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      if (!websiteData) {
        console.log('No website found for slug:', slug);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      console.log('Website data loaded:', websiteData);

      // Validate and clean the customization data
      const cleanedData = {
        ...websiteData,
        customization_data: validateCustomizationData(websiteData.customization_data)
      };

      setWebsite(cleanedData);

      // Load the template data
      const { data: templateData, error: templateError } = await supabase
        .from('website_templates')
        .select('*')
        .eq('id', websiteData.template_id)
        .maybeSingle();

      if (templateError) {
        console.error('Template query error:', templateError);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      if (!templateData) {
        console.log('No template found for id:', websiteData.template_id);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      console.log('Template data loaded:', templateData);
      setTemplate(templateData);
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading website:', error);
      setNotFound(true);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TheraLoader message="Loading website..." size="lg" />
      </div>
    );
  }

  if (notFound || !website || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Website Not Found</h2>
          <p className="text-gray-600 mb-6">
            The coaching website you're looking for doesn't exist or hasn't been published yet.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Homepage</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WebsiteErrorBoundary>
      <div className="min-h-screen">
        <TemplatePreview
          template={template}
          customizationData={website.customization_data}
          isPublicView={true}
        />
      </div>
    </WebsiteErrorBoundary>
  );
};
