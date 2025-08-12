
import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { MonthlyAstroFormatter } from '@/components/astro-formatters/MonthlyAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { getAstroReportType } from './AstroDataRenderer';

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
  const astroReportType = getAstroReportType(reportData.swiss_data);

  const renderAstroContent = () => {
    switch (astroReportType) {
      case 'monthly':
        return <MonthlyAstroFormatter swissData={reportData.swiss_data} reportData={reportData} />;
      case 'synastry':
        return <SynastryAstroFormatter swissData={reportData.swiss_data} reportData={reportData} />;
      case 'individual':
      default:
        return <IndividualAstroFormatter swissData={reportData.swiss_data} reportData={reportData} />;
    }
  };

  const renderContent = () => {
    switch (contentType) {
      case 'ai':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <ReportRenderer reportData={reportData} />
          </div>
        );
      
      case 'astro':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            {renderAstroContent()}
          </div>
        );
      
      case 'both':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            {activeView === 'astro' ? renderAstroContent() : <ReportRenderer reportData={reportData} />}
          </div>
        );
      
      default:
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <div className="text-center text-gray-500">
              <p>No content available for this report.</p>
            </div>
          </div>
        );
    }
  };

  const content = renderContent();
  
  return content;
};
