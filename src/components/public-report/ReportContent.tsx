
import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ReportData, extractAstroContent } from '@/utils/reportContentExtraction';

interface ReportContentProps {
  reportData: ReportData;
  activeView: 'report' | 'astro';
  setActiveView: (view: 'report' | 'astro') => void;
  isMobile?: boolean;
}

export const ReportContent: React.FC<ReportContentProps> = ({
  reportData,
  activeView,
  setActiveView,
  isMobile = false
}) => {
  const contentType = reportData.metadata.content_type;

  const renderContent = () => {
    switch (contentType) {
      case 'ai':
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <ReportRenderer reportData={reportData} />
          </div>
        );
      
      case 'astro':
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <ReportRenderer reportData={reportData} />
          </div>
        );
      
      case 'both':
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <ReportRenderer 
              reportData={reportData} 
              activeView={activeView}
            />
          </div>
        );
      
      default:
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center text-gray-500">
              <p>No content available for this report.</p>
            </div>
          </div>
        );
    }
  };

  return renderContent();
};
