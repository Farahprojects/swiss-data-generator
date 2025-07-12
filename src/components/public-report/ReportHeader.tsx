
import React from 'react';
import { ArrowLeft, Copy, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasValidAstroData } from '@/utils/swissDataFormatter';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';

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
  isDownloading?: boolean;
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
  isPureAstroReport,
  isDownloading = false
}: ReportHeaderProps) => {
  // Debug logging to verify props
  console.log("ReportHeader props:", {
    reportPdfData,
    swissData,
    reportContent,
  });
  // Use intelligent content detection for toggle logic
  const reportData = { reportContent, swissData, swissBoolean, hasReport };
  const toggleLogic = getToggleDisplayLogic(reportData);
  const showToggle = toggleLogic.showToggle;
  
  return (
    <div className="sticky top-0 z-[100] bg-background border-b shadow-sm" style={{ position: 'relative' }}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              onMouseDown={onBack}
              tabIndex={0}
              style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
              className="flex items-center gap-2 cursor-pointer pointer-events-auto !cursor-pointer"
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
              onMouseDown={onCopyToClipboard}
              tabIndex={0}
              style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
              className="flex items-center gap-2 pointer-events-auto !cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {(reportPdfData || swissData || (reportContent && reportContent.trim().length > 20)) && (
              <Button
                variant="outline"
                size="sm"
                disabled={isDownloading}
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
                onMouseDown={() => {
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
                tabIndex={0}
                style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                className="flex items-center gap-2 pointer-events-auto !cursor-pointer"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'Generating...' : 'PDF'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onChatGPTClick}
              onMouseDown={onChatGPTClick}
              tabIndex={0}
              style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md font-inter transition-all duration-200 pointer-events-auto !cursor-pointer"
            >
              <img 
                src="/lovable-uploads/a27cf867-e7a3-4d2f-af1e-16aaa70117e4.png" 
                alt="ChatGPT" 
                className="h-4 w-4"
                onError={(e) => {
                  console.log('ChatGPT image failed to load, using fallback');
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0734a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'/%3E%3C/svg%3E";
                }}
              />
              <span className="font-medium">ChatGPT</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              onMouseDown={onBack}
              tabIndex={0}
              style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
              className="p-2 pointer-events-auto !cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
