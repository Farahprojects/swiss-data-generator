
import React from 'react';
import { ArrowLeft, Copy, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasValidAstroData } from '@/utils/swissDataFormatter';
import { shouldHideToggle } from '@/utils/reportTypeUtils';

interface ReportHeaderProps {
  customerName: string;
  onBack: () => void;
  onCopyToClipboard: () => void;
  onDownloadPdf: () => void;
  onDownloadAstroPdf?: () => void;
  onChatGPTClick: () => void;
  reportPdfData?: string | null;
  isCopyCompleted: boolean;
  swissData?: any;
  reportContent: string;
  activeView?: 'report' | 'astro';
  setActiveView?: (view: 'report' | 'astro') => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
  isPureAstroReport?: boolean;
}

export const ReportHeader = ({
  customerName,
  onBack,
  onCopyToClipboard,
  onDownloadPdf,
  onDownloadAstroPdf,
  onChatGPTClick,
  reportPdfData,
  isCopyCompleted,
  swissData,
  reportContent,
  activeView,
  setActiveView,
  hasReport,
  swissBoolean,
  isPureAstroReport
}: ReportHeaderProps) => {
  // Debug logging to verify props
  console.log("ReportHeader props:", {
    reportPdfData,
    swissData,
    reportContent,
  });
  // Use utility function for reliable toggle detection
  const reportData = { reportContent, swissData, swissBoolean, hasReport };
  const hideToggle = shouldHideToggle(reportData);
  const showToggle = !hideToggle;
  
  return (
    <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Form</span>
            </Button>
            {showToggle && setActiveView && (
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyToClipboard}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {(reportPdfData || swissData || (reportContent && reportContent.trim().length > 20)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (reportPdfData && swissData) {
                    onDownloadAstroPdf?.(); // Combined version
                  } else if (reportPdfData) {
                    onDownloadPdf();
                  } else if (swissData) {
                    onDownloadAstroPdf?.();
                  } else if (reportContent && reportContent.trim().length > 20) {
                    onDownloadAstroPdf?.(); // Use unified PDF for AI content
                  }
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            )}
            <Button
              size="sm"
              onClick={onChatGPTClick}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md font-inter transition-all duration-200"
            >
              <img 
                src="/lovable-uploads/6c5be1f5-cd98-48a0-962f-2dd52fc0604e.png" 
                alt="ChatGPT" 
                className="h-4 w-4"
              />
              <span className="font-medium">ChatGPT</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
