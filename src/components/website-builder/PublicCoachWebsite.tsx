
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TemplatePreview } from "./TemplatePreview";
import { TheraLoader } from "@/components/ui/TheraLoader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
      // Query coach_websites for a published website with this slug
      const { data: websiteData, error: websiteError } = await supabase
        .from('coach_websites')
        .select('*')
        .eq('site_slug', slug)
        .eq('is_published', true)
        .single();

      if (websiteError || !websiteData) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setWebsite(websiteData);

      // Load the template data
      const { data: templateData, error: templateError } = await supabase
        .from('website_templates')
        .select('*')
        .eq('id', websiteData.template_id)
        .single();

      if (templateError || !templateData) {
        console.error('Template not found:', templateError);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

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
    <div className="min-h-screen">
      <TemplatePreview
        template={template}
        customizationData={website.customization_data}
        isPublicView={true}
      />
    </div>
  );
};
