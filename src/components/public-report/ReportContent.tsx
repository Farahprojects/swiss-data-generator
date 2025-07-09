
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
}

export const ReportContent = ({ 
  reportContent, 
  swissData, 
  customerName, 
  activeView: externalActiveView, 
  setActiveView: externalSetActiveView,
  hasReport,
  swissBoolean
}: ReportContentProps) => {
  const [internalActiveView, setInternalActiveView] = useState<'report' | 'astro'>('report');
  
  const activeView = externalActiveView || internalActiveView;
  const setActiveView = externalSetActiveView || setInternalActiveView;
  
  // Updated logic: Show toggle when there's both report content AND Swiss data
  // swiss_boolean = false + has_report = true = Both exist (show toggle)
  // swiss_boolean = true = Only Swiss data exists (show toggle)
  // Use the same logic as ReportHeader
  const showToggle = hasReport === true && (swissBoolean === false || swissBoolean === true) && !externalActiveView;
  
  // Debug logging
  console.log('🔍 ReportContent Toggle Debug:', { 
    hasReport, 
    swissBoolean, 
    reportContent: !!reportContent, 
    showToggle,
    externalActiveView,
    swissData: !!swissData 
  });
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg border-0 shadow-2xl">
        <CardHeader className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-light text-gray-900 tracking-tight">
              Your <em className="italic font-light">Report</em> - Generated for {customerName}
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
