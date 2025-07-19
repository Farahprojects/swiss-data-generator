
import React from 'react';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';

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
  // Single source of truth for synastry detection
  if (isSynastryReport(reportData)) {
    return <SynastryAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  return <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;
};

// Export the detection function for use elsewhere
export { isSynastryReport };
