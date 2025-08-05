
import React from 'react';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { UniversalAstroFormatter } from '@/components/astro-formatters/UniversalAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { hasValidAstroData } from '@/utils/swissDataFormatter';

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

// Helper function to detect traditional natal reports
const isTraditionalNatal = (swissData: any): boolean => {
  if (!swissData) return false;
  
  // Check for traditional natal chart structure
  return !!(
    swissData.planets ||
    swissData.houses ||
    swissData.aspects ||
    (swissData.natal && (swissData.natal.planets || swissData.natal.houses))
  );
};

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  // Priority 1: Check for synastry reports
  if (isSynastryReport(reportData)) {
    return <SynastryAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  // Priority 2: Check for traditional natal chart structure
  if (isTraditionalNatal(swissData)) {
    return <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  // Priority 3: Universal fallback for any valid astro data (focus, transit, etc.)
  if (hasValidAstroData(swissData)) {
    return <UniversalAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  // No valid astro data found
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        No astrological data available to display.
      </p>
    </div>
  );
};

// Export the detection functions for use elsewhere
export { isSynastryReport, isTraditionalNatal };
