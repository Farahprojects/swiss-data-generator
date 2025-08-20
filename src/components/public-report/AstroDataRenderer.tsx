
import React from 'react';
import { IndividualAstroFormatter } from '@/components/astro-formatters/IndividualAstroFormatter';
import { SynastryAstroFormatter } from '@/components/astro-formatters/SynastryAstroFormatter';
import { MonthlyAstroFormatter } from '@/components/astro-formatters/MonthlyAstroFormatter';
import { ReportData } from '@/utils/reportContentExtraction';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseAstroData } from '@/lib/astroFormatter';

interface AstroDataRendererProps {
  swissData: any;
  reportData: ReportData;
}

// New helper to detect the specific type of astro report
const getAstroReportType = (swissData: any): 'monthly' | 'synastry' | 'individual' => {
  if (!swissData) return 'individual'; // Fallback
  
  const parsed = parseAstroData(swissData);
  
  if (parsed.monthly) return 'monthly';
  if (parsed.natal_set?.personB) return 'synastry';
  
  return 'individual';
};

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  const isMobile = useIsMobile();
  const reportType = getAstroReportType(swissData);

  const renderContent = () => {
    switch(reportType) {
      case 'monthly':
        return <MonthlyAstroFormatter swissData={swissData} reportData={reportData} />;
      case 'synastry':
        return <SynastryAstroFormatter swissData={swissData} reportData={reportData} />;
      case 'individual':
      default:
        return <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
};

// Export the detection function for use elsewhere
export { getAstroReportType };
