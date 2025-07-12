import React from 'react';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { AstroDataRenderer } from '@/components/public-report/AstroDataRenderer';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
import { MappedReport } from '@/types/mappedReport';

interface ReportPrintProps {
  mappedReport: MappedReport;
}

export const ReportPrint: React.FC<ReportPrintProps> = ({ mappedReport }) => {
  // Use intelligent content detection to determine what to show
  const reportAnalysisData = { 
    reportContent: mappedReport.reportContent, 
    swissData: mappedReport.swissData, 
    swissBoolean: mappedReport.swissBoolean, 
    hasReport: mappedReport.hasReport 
  };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 bg-white text-black">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <h1 className="text-2xl font-light text-gray-900 tracking-tight mb-2">
          {toggleLogic.title}
        </h1>
        <p className="text-lg font-light text-gray-600">
          Generated for {mappedReport.customerName}
        </p>
      </div>

      {/* Content - Show both if available, otherwise show what's available */}
      <div className="space-y-12">
        {/* AI Report Content */}
        {mappedReport.reportContent && mappedReport.reportContent.trim().length > 0 && (
          <div>
            <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight">
              Report Analysis
            </h2>
            <div className="prose prose-lg max-w-none">
              <ReportRenderer content={mappedReport.reportContent} />
            </div>
          </div>
        )}

        {/* Astrological Data */}
        {mappedReport.swissData && (
          <div>
            <h2 className="text-xl font-light text-gray-900 mb-6 tracking-tight">
              Astrological Data
            </h2>
            <AstroDataRenderer 
              swissData={mappedReport.swissData} 
              reportData={mappedReport} 
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500 font-light">
          Generated on {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
    </div>
  );
};