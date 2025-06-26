
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TheraLoader } from "@/components/ui/TheraLoader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WebsiteErrorBoundary } from "./WebsiteErrorBoundary";
import { log } from "@/utils/logUtils";
import { ClassicReportPage } from "./report-pages/ClassicReportPage";
import { ModernReportPage } from "./report-pages/ModernReportPage";
import { MinimalReportPage } from "./report-pages/MinimalReportPage";
import { ProfessionalReportPage } from "./report-pages/ProfessionalReportPage";
import { CreativeReportPage } from "./report-pages/CreativeReportPage";

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

export const CoachReportPage: React.FC = () => {
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
      log('debug', `Loading coach website for report page: ${slug}`);
      
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('id, template_id, customization_data, is_published')
        .eq('site_slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (websiteError || !websiteData) {
        log('error', 'Website not found for report page', { slug });
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setWebsite(websiteData);

      const { data: templateData, error: templateError } = await supabase
        .from('website_templates')
        .select('*')
        .eq('id', websiteData.template_id)
        .maybeSingle();

      if (templateError || !templateData) {
        log('error', 'Template not found for report page', { templateId: websiteData.template_id });
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setTemplate(templateData);
      setIsLoading(false);

    } catch (error) {
      log('error', 'Error loading website for report page', error);
      setNotFound(true);
      setIsLoading(false);
    }
  };

  const renderReportPage = () => {
    if (!website || !template) return null;

    const props = {
      customizationData: website.customization_data,
      coachSlug: slug!
    };

    switch (template.name) {
      case 'Classic':
        return <ClassicReportPage {...props} />;
      case 'Modern':
        return <ModernReportPage {...props} />;
      case 'Minimal':
        return <MinimalReportPage {...props} />;
      case 'Professional':
        return <ProfessionalReportPage {...props} />;
      case 'Creative':
        return <CreativeReportPage {...props} />;
      default:
        return <ModernReportPage {...props} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TheraLoader message="Loading report page..." size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Report Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The report page you're looking for doesn't exist or hasn't been published yet.
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
        {renderReportPage()}
      </div>
    </WebsiteErrorBoundary>
  );
};
