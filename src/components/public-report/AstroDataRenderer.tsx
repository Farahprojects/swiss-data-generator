
import React from 'react';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { formatSwissAstroData, hasValidAstroData } from '@/utils/swissDataFormatter';

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

// Helper function to detect if data works with specialized formatters
const hasSpecializedFormat = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  
  // Check for individual natal chart structure
  const hasNatalStructure = !!(
    reportData.swiss_data.planets ||
    reportData.swiss_data.houses ||
    reportData.swiss_data.aspects
  );
  
  // Check for synastry structure
  const hasSynastryStructure = isSynastryReport(reportData);
  
  return hasNatalStructure || hasSynastryStructure;
};

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  // Check if we have valid astro data first
  if (!hasValidAstroData(swissData) && !hasValidAstroData(reportData.swiss_data)) {
    return <div className="p-4 text-muted-foreground">No astrological data available</div>;
  }

  // If data works with specialized formatters, use them
  if (hasSpecializedFormat(reportData)) {
    if (isSynastryReport(reportData)) {
      return <SynastryAstroFormatter swissData={swissData} reportData={reportData} />;
    }
    return <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  // Fallback: use the general formatter for unrecognized data structures
  const formattedData = formatSwissAstroData(swissData || reportData.swiss_data);
  
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Astrological Data</h3>
      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
        {formattedData}
      </pre>
    </div>
  );
};

// Export the detection function for use elsewhere
export { isSynastryReport };
