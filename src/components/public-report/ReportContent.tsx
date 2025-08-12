
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
  const hasAiContent = !!reportData.report_content && reportData.report_content.trim().length > 20;
  const hasAstroContent = !!reportData.swiss_data;
  const astroReportType = hasAstroContent ? getAstroReportType(reportData.swiss_data) : null;

  const renderAstroContent = () => {
    if (!hasAstroContent) return null;

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
    if (hasAiContent && hasAstroContent) {
      // 'both' case: render with a toggle
      return (
        <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
          {activeView === 'astro' ? renderAstroContent() : <ReportRenderer reportData={reportData} />}
        </div>
      );
    } else if (hasAstroContent) {
      // 'astro' only case
      return (
        <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
          {renderAstroContent()}
        </div>
      );
    } else if (hasAiContent) {
      // 'ai' only case
      return (
        <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
          <ReportRenderer reportData={reportData} />
        </div>
      );
    } else {
      // Default empty case
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
