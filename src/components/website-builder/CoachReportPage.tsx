
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClassicReportPage } from "./report-pages/ClassicReportPage";
import { ModernReportPage } from "./report-pages/ModernReportPage";
import { MinimalReportPage } from "./report-pages/MinimalReportPage";
import { CreativeReportPage } from "./report-pages/CreativeReportPage";
import { ProfessionalReportPage } from "./report-pages/ProfessionalReportPage";
import { AbstractReportPage } from "./report-pages/AbstractReportPage";
import { TheraLoader } from "@/components/ui/TheraLoader";

export const CoachReportPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: website, isLoading, error } = useQuery({
    queryKey: ['coach-website', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_websites')
        .select(`
          *,
          website_templates (
            name,
            template_data
          )
        `)
        .eq('site_slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug
  });

  if (isLoading) {
    return <TheraLoader message="Loading..." size="lg" />;
  }

  if (error || !website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website Not Found</h1>
          <p className="text-gray-600">The requested coaching website could not be found.</p>
        </div>
      </div>
    );
  }

  const templateName = website.website_templates?.name?.toLowerCase();
  const customizationData = website.customization_data || {};

  const renderReportPage = () => {
    switch (templateName) {
      case 'classic':
        return <ClassicReportPage customizationData={customizationData} />;
      case 'modern':
        return <ModernReportPage customizationData={customizationData} />;
      case 'minimal':
        return <MinimalReportPage customizationData={customizationData} />;
      case 'creative':
        return <CreativeReportPage customizationData={customizationData} />;
      case 'professional':
        return <ProfessionalReportPage customizationData={customizationData} />;
      case 'abstract':
        return <AbstractReportPage customizationData={customizationData} />;
      default:
        return <ClassicReportPage customizationData={customizationData} />;
    }
  };

  return renderReportPage();
};
