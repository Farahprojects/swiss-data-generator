
import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';

interface ReportContentProps {
  reportData: ReportData;
  activeView: 'report' | 'astro';
  setActiveView: (view: 'report' | 'astro') => void;
  isMobile?: boolean;
}

// Helper function to detect synastry reports
const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  
  // Check for synastry-specific data structures
  return !!(
    reportData.swiss_data.synastry_aspects ||
    reportData.swiss_data.composite_chart ||
    reportData.swiss_data.person_a ||
    reportData.swiss_data.person_b ||
    reportData.guest_report?.report_data?.secondPersonName
  );
};

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
          <div className="max-w-4xl mx-auto px-4 py-8">
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
