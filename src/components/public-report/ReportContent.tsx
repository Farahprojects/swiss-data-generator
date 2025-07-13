import React, { useState, useEffect } from 'react';
import { FileText, Stars } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AstroDataRenderer } from './AstroDataRenderer';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
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

  // Mobile-first rendering without containers - header handled by parent
  if (isMobile) {
    return (
      <div id="report-content" className="w-full">
        {activeView === 'report' ? (
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
    <div id="report-content" className="max-w-4xl mx-auto px-4 py-8">
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
              {activeView === 'report' ? (
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

