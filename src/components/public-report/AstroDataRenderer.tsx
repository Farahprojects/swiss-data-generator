
import React from 'react';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { useIsMobile } from '@/hooks/use-mobile';

interface AstroDataRendererProps {
  swissData: any;
  reportData: ReportData;
}

// Helper function to detect synastry reports - centralized logic
const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  
  return !!(
    reportData.swiss_data.synastry_aspects ||
    reportData.swiss_data.composite_chart ||
    reportData.swiss_data.person_a ||
    reportData.swiss_data.person_b ||
    reportData.guest_report?.report_data?.secondPersonName
  );
};

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  const isMobile = useIsMobile();

  const content = isSynastryReport(reportData)
    ? <SynastryAstroFormatter swissData={swissData} reportData={reportData} />
    : <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;

  return (
    <div className={isMobile ? "overflow-x-auto -mx-4 px-4" : ""}>
      <div className={isMobile ? "min-w-[768px]" : ""}>
        {content}
      </div>
    </div>
  );
};

// Export the detection function for use elsewhere
export { isSynastryReport };
