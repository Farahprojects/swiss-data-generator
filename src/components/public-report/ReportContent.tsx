
import React, { useState } from 'react';
import { FileText, Stars } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportRenderer } from '@/components/shared/ReportRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatSwissAstroData, hasValidAstroData } from '@/utils/swissDataFormatter';

interface ReportContentProps {
  reportContent: string;
  swissData?: any;
}

export const ReportContent = ({ reportContent, swissData }: ReportContentProps) => {
  const [activeView, setActiveView] = useState<'report' | 'astro'>('report');
  
  const hasSwissData = hasValidAstroData(swissData);
  const showToggle = hasSwissData && reportContent;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="shadow-lg border-0 shadow-2xl">
        <CardHeader className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-light text-gray-900 tracking-tight">
              {activeView === 'report' ? (
                <>
                  <FileText className="h-6 w-6 text-gray-600" />
                  Report Content
                </>
              ) : (
                <>
                  <Stars className="h-6 w-6 text-gray-600" />
                  Astro Data
                </>
              )}
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
                <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 bg-gray-50 p-6 rounded-lg">
                  {formatSwissAstroData(swissData)}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
