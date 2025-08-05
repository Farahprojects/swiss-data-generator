import React from 'react';
import { formatSwissAstroData, hasValidAstroData } from '@/utils/swissDataFormatter';
import { ReportData } from '@/utils/reportContentExtraction';

interface UniversalAstroFormatterProps {
  swissData: any;
  reportData: ReportData;
  className?: string;
}

export const UniversalAstroFormatter = ({ 
  swissData, 
  reportData, 
  className = "" 
}: UniversalAstroFormatterProps) => {
  // Extract birth information from reportData
  const birthInfo = reportData?.guest_report?.report_data;
  const personName = birthInfo?.firstName || birthInfo?.name || "Chart";
  
  // Check if we have valid astro data
  if (!hasValidAstroData(swissData)) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No astrological data available to display.
          </p>
        </div>
      </div>
    );
  }

  // Format the data using the legacy formatter
  const formattedData = formatSwissAstroData(swissData);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light">
          Astrological Data for <em className="italic">{personName}</em>
        </h2>
        {birthInfo && (
          <div className="text-muted-foreground space-y-1">
            {birthInfo.birthDate && (
              <p>Born: {new Date(birthInfo.birthDate).toLocaleDateString()}</p>
            )}
            {birthInfo.birthTime && (
              <p>Time: {birthInfo.birthTime}</p>
            )}
            {(birthInfo.birthCity || birthInfo.birthLocation) && (
              <p>Location: {birthInfo.birthCity || birthInfo.birthLocation}</p>
            )}
          </div>
        )}
      </div>

      {/* Formatted Data Display */}
      <div className="bg-card rounded-xl p-6 border">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {formattedData}
          </pre>
        </div>
      </div>

      {/* Raw Data Debug (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-muted/50 rounded-xl p-4 border">
          <summary className="cursor-pointer font-medium text-sm mb-2">
            Debug: Raw Swiss Data
          </summary>
          <pre className="text-xs bg-background rounded p-3 overflow-auto max-h-64">
            {JSON.stringify(swissData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};