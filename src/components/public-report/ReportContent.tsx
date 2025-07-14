import React, { useState, useEffect } from 'react';
import { FileText, Stars } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AstroDataRenderer } from './AstroDataRenderer';
import { ProcessingIndicator } from '@/components/ui/ProcessingIndicator';
import { getToggleDisplayLogic, getReportContentType } from '@/utils/reportTypeUtils';
import { MappedReport } from '@/types/mappedReport';

interface ReportContentProps {
  mappedReport: MappedReport;
  activeView?: 'report' | 'astro';
  setActiveView?: (view: 'report' | 'astro') => void;
  isMobile?: boolean;
}

export const ReportContent = ({
  mappedReport,
  activeView: externalActiveView,
  setActiveView: externalSetActiveView,
  isMobile = false,
}: ReportContentProps) => {
  // Use intelligent content detection
  const reportAnalysisData = { 
    reportContent: mappedReport.reportContent, 
    swissData: mappedReport.swissData, 
    swissBoolean: mappedReport.swissBoolean, 
    hasReport: mappedReport.hasReport 
  };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);
  const [internalActiveView, setInternalActiveView] = useState<'report' | 'astro'>(toggleLogic.defaultView);

  const activeView = externalActiveView || internalActiveView;
  const setActiveView = externalSetActiveView || setInternalActiveView;

  // Enforce content-based view restrictions
  useEffect(() => {
    if (!toggleLogic.showToggle) {
      setActiveView(toggleLogic.defaultView);
    }
  }, [toggleLogic.showToggle, toggleLogic.defaultView, setActiveView]);

  // Smart toggle visibility
  const showToggle = toggleLogic.showToggle && !externalActiveView;

  // Check if data is still loading/incomplete - enhanced for sync reports
  const isDataLoading = () => {
    const contentType = getReportContentType({
      reportContent: mappedReport.reportContent,
      swissData: mappedReport.swissData,
      reportType: mappedReport.reportType,
      hasReport: mappedReport.hasReport
    });

    // For hybrid reports (sync reports), we need BOTH pieces of data
    if (contentType === 'hybrid') {
      const hasValidReportContent = mappedReport.reportContent && mappedReport.reportContent.trim().length > 0;
      const hasValidSwissData = mappedReport.swissData && Object.keys(mappedReport.swissData).length > 0;
      return !hasValidReportContent || !hasValidSwissData;
    }
    
    // For AI-only reports, only check reportContent
    if (contentType === 'ai-only') {
      return !mappedReport.reportContent || mappedReport.reportContent.trim().length === 0;
    }
    
    // For astro-only reports, only check swissData
    if (contentType === 'astro-only') {
      return !mappedReport.swissData || Object.keys(mappedReport.swissData).length === 0;
    }
    
    // Default fallback: if we can't determine type, require both to be safe
    return !mappedReport.reportContent || !mappedReport.swissData;
  };

  // Render loading state with improved messaging
  const renderLoadingState = () => {
    const contentType = getReportContentType({
      reportContent: mappedReport.reportContent,
      swissData: mappedReport.swissData,
      reportType: mappedReport.reportType,
      hasReport: mappedReport.hasReport
    });

    let loadingMessage = "Preparing your report...";
    let subMessage = "Just one moment while we finalize your content";

    if (contentType === 'hybrid') {
      if (!mappedReport.reportContent && !mappedReport.swissData) {
        loadingMessage = "Loading your complete report...";
        subMessage = "Preparing both AI analysis and astrology data";
      } else if (!mappedReport.reportContent) {
        loadingMessage = "Loading AI analysis...";
        subMessage = "Astrology data ready, finalizing AI insights";
      } else if (!mappedReport.swissData) {
        loadingMessage = "Loading astrology data...";
        subMessage = "AI analysis ready, finalizing astrology calculations";
      }
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ProcessingIndicator message={loadingMessage} className="text-lg" />
        <p className="text-gray-500 font-light text-sm">{subMessage}</p>
      </div>
    );
  };

  // Mobile-first rendering without containers - header handled by parent
  if (isMobile) {
    return (
      <div className="w-full">
        {isDataLoading() ? (
          renderLoadingState()
        ) : activeView === 'report' ? (
          <div className="prose prose-lg max-w-none text-left">
            <ReportRenderer content={mappedReport.reportContent} />
          </div>
        ) : (
          <AstroDataRenderer swissData={mappedReport.swissData} reportData={mappedReport} />
        )}
      </div>
    );
  }

  // Desktop rendering with containers
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg border-0 shadow-2xl">
        <CardHeader className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-light text-gray-900 tracking-tight">
              {toggleLogic.title} — Generated for {mappedReport.customerName}
            </CardTitle>

            {showToggle && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('report')}
                  className={`px-4 py-2 rounded-md text-sm font-light transition-all ${
                    activeView === 'report'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Report
                </button>
                <button
                  onClick={() => setActiveView('astro')}
                  className={`px-4 py-2 rounded-md text-sm font-light transition-all ${
                    activeView === 'astro'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Astro
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <div className="p-8">
              {isDataLoading() ? (
                renderLoadingState()
              ) : activeView === 'report' ? (
                <div className="prose prose-lg max-w-none text-left">
                  <ReportRenderer content={mappedReport.reportContent} />
                </div>
              ) : (
                <AstroDataRenderer swissData={mappedReport.swissData} reportData={mappedReport} />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

