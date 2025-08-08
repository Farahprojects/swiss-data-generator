
import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { isSynastryReport } from './AstroDataRenderer';

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
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            <ReportRenderer reportData={reportData} />
          </div>
        );
      
      case 'astro':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            {isSynastryReport(reportData) ? (
              <SynastryAstroFormatter 
                swissData={reportData.swiss_data} 
                reportData={reportData}
              />
            ) : (
              <IndividualAstroFormatter 
                swissData={reportData.swiss_data} 
                reportData={reportData}
              />
            )}
          </div>
        );
      
      case 'both':
        return (
          <div className="max-w-4xl mx-auto px-0 md:px-4 py-8">
            {activeView === 'astro' ? (
              isSynastryReport(reportData) ? (
                <SynastryAstroFormatter 
                  swissData={reportData.swiss_data} 
                  reportData={reportData}
                />
              ) : (
                <IndividualAstroFormatter 
                  swissData={reportData.swiss_data} 
                  reportData={reportData}
                />
              )
            ) : (
              <ReportRenderer reportData={reportData} />
            )}
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
