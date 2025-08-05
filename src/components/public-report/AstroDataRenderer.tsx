
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

// Simple function to format any data structure nicely
const formatAnyData = (data: any): JSX.Element => {
  if (!data) return <div className="text-muted-foreground">No data available</div>;

  const renderValue = (value: any, key?: string): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <span className="text-foreground">{String(value)}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">empty array</span>;
      }
      return (
        <div className="ml-4 space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-muted-foreground text-xs">•</span>
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic">empty object</span>;
      }
      return (
        <div className="ml-4 space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="space-y-1">
              <div className="font-medium text-sm text-foreground capitalize">
                {k.replace(/_/g, ' ')}:
              </div>
              <div className="ml-2">{renderValue(v, k)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-foreground">{String(value)}</span>;
  };

  return <div className="space-y-3">{renderValue(data)}</div>;
};

export const AstroDataRenderer = ({ swissData, reportData }: AstroDataRendererProps) => {
  const dataToUse = swissData || reportData.swiss_data;
  
  // Check if we have any data at all
  if (!dataToUse || (typeof dataToUse === 'object' && Object.keys(dataToUse).length === 0)) {
    return <div className="p-4 text-muted-foreground">No astrological data available</div>;
  }

  // Check for synastry data first
  if (isSynastryReport(reportData)) {
    return <SynastryAstroFormatter swissData={swissData} reportData={reportData} />;
  }

  // Check for individual natal chart structure
  const hasNatalStructure = !!(
    dataToUse.planets ||
    dataToUse.houses ||
    dataToUse.aspects
  );

  if (hasNatalStructure) {
    return <IndividualAstroFormatter swissData={swissData} reportData={reportData} />;
  }
  
  // Fallback: display any data structure in a nice way
  return (
    <div className="space-y-6 p-6 font-inter">
      <h3 className="text-xl font-light text-foreground">
        Astrological <em className="italic">Data</em>
      </h3>
      <div className="bg-muted/30 rounded-xl p-6">
        {formatAnyData(dataToUse)}
      </div>
    </div>
  );
};

// Export the detection function for use elsewhere
export { isSynastryReport };
