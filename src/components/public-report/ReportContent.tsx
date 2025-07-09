
import React, { useState } from 'react';
import { FileText, Stars } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatSwissAstroData, hasValidAstroData } from '@/utils/swissDataFormatter';
import { AstroDataRenderer } from './AstroDataRenderer';

interface ReportContentProps {
  reportContent: string;
  swissData?: any;
  customerName: string;
  activeView?: 'report' | 'astro';
  setActiveView?: (view: 'report' | 'astro') => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
  isPureAstroReport?: boolean;
}

export const ReportContent = ({ 
  reportContent, 
  swissData, 
  customerName, 
  activeView: externalActiveView, 
  setActiveView: externalSetActiveView,
  hasReport,
  swissBoolean,
  isPureAstroReport
}: ReportContentProps) => {
  // For pure astro reports, default to astro view
  const defaultView = isPureAstroReport ? 'astro' : 'report';
  const [internalActiveView, setInternalActiveView] = useState<'report' | 'astro'>(defaultView);
  
  const activeView = externalActiveView || internalActiveView;
  const setActiveView = externalSetActiveView || setInternalActiveView;
  
  // Hide toggle for pure astro reports or when swiss_boolean is true (no AI report)
  const showToggle = !isPureAstroReport && !externalActiveView && !swissBoolean && hasReport;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg border-0 shadow-2xl">
        <CardHeader className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-light text-gray-900 tracking-tight">
              Your <em className="italic font-light">{activeView === 'astro' ? 'Astro Data' : 'Report'}</em> - Generated for {customerName}
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
                  <ReportRenderer content={reportContent} />
                </div>
              ) : (
                <AstroDataRenderer swissData={swissData} />
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
