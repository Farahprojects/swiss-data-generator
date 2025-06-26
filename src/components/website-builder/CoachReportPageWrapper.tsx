
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TheraLoader } from "@/components/ui/TheraLoader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WebsiteErrorBoundary } from "./WebsiteErrorBoundary";
import { log } from "@/utils/logUtils";
import { CoachReportForm } from "./CoachReportForm";

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

export const CoachReportPageWrapper: React.FC = () => {
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
      log('debug', `Loading coach website for report form: ${slug}`);
      
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('id, template_id, customization_data, is_published')
        .eq('site_slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (websiteError || !websiteData) {
        log('error', 'Website not found for report form', { slug });
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
        log('error', 'Template not found for report form', { templateId: websiteData.template_id });
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setTemplate(templateData);
      setIsLoading(false);

    } catch (error) {
      log('error', 'Error loading website for report form', error);
      setNotFound(true);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TheraLoader message="Loading report form..." size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Report Form Not Found</h2>
          <p className="text-gray-600 mb-6">
            The report form you're looking for doesn't exist or hasn't been published yet.
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

  if (!website) return null;

  const coachName = website.customization_data?.coachName || 'Coach';
  const themeColor = website.customization_data?.themeColor || '#6366F1';
  const fontFamily = website.customization_data?.fontFamily || 'Inter';

  return (
    <WebsiteErrorBoundary>
      <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
        {/* Header with coach branding */}
        <div 
          className="py-8 px-4 text-center text-white"
          style={{ 
            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
            fontFamily: `${fontFamily}, sans-serif`
          }}
        >
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => navigate(`/${slug}`)}
              variant="ghost"
              className="absolute left-4 top-4 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {coachName}'s Site
            </Button>
            <h1 className="text-3xl font-bold mb-2">Get Your Personal Report</h1>
            <p className="text-lg opacity-90">
              Discover your unique insights with {coachName}
            </p>
          </div>
        </div>

        {/* Report Form */}
        <div className="max-w-4xl mx-auto">
          <CoachReportForm 
            coachSlug={slug}
            coachName={coachName}
            customizationData={website.customization_data}
          />
        </div>
      </div>
    </WebsiteErrorBoundary>
  );
};
