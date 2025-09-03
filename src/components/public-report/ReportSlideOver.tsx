import React, { useState, useEffect } from 'react';
import { X, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportContent } from './ReportContent';
import { supabase } from '@/integrations/supabase/client';
import { ReportData, extractReportContent, getPersonName } from '@/utils/reportContentExtraction';
import { renderUnifiedContentAsText } from '@/utils/componentToTextRenderer';
import { useReportData } from '@/hooks/useReportData';
import { AstroDataRenderer } from './AstroDataRenderer';

interface ReportSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad?: (error?: string | null) => void;
  shouldFetch?: boolean;
  guestReportId?: string;
}



export const ReportSlideOver: React.FC<ReportSlideOverProps> = ({ 
  isOpen, 
  onClose, 
  onLoad, 
  shouldFetch = false,
  guestReportId 
}) => {
  const { reportData, isLoading, error, fetchReport } = useReportData();
  const [activeView, setActiveView] = useState<'report' | 'astro'>('report');
  const isMobile = useIsMobile();

  // Determine what views to show based on metadata
  const hasReport = reportData?.metadata?.has_ai_report || false;
  const hasSwissData = reportData?.metadata?.has_swiss_data || false;
  const showToggle = hasReport && hasSwissData;
  const defaultView = hasReport ? 'report' : 'astro';

  // Set initial active view based on metadata when report data loads
  useEffect(() => {
    if (reportData && !showToggle) {
      setActiveView(defaultView);
    }
  }, [reportData, showToggle, defaultView]);

  // Fetch when explicitly told to via shouldFetch prop
  useEffect(() => {
    if (shouldFetch && guestReportId && guestReportId !== 'new') {
      fetchReport(guestReportId);
    } else if (shouldFetch && !guestReportId) {
      console.warn('[ReportSlideOver] No guest report ID provided');
    }
  }, [shouldFetch, guestReportId, fetchReport]);

  useEffect(() => {
    if (!isLoading) {
      onLoad?.(error);
    }
  }, [isLoading, error, onLoad]);

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your report...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error loading report: {error}</p>
              <Button onClick={() => guestReportId && fetchReport(guestReportId)}>
                Try Again
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Show astro data form for new users
  if (guestReportId === 'new') {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="flex flex-row items-center justify-between px-6 py-4 border-b bg-white">
              <SheetTitle className="text-lg font-medium text-gray-900">Add Astro Data</SheetTitle>
              <SheetDescription className="text-sm text-gray-600">Enter your birth details to get started</SheetDescription>
            </SheetHeader>
            <div className="flex-1 p-6">
              {/* Import and use the existing AstroDataForm component */}
              <div className="text-center py-8 text-gray-500">
                <p>Astro data form will be integrated here</p>
                <p className="text-sm mt-2">This will allow fresh users to add their birth details</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!reportData) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">No report data available.</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const personName = getPersonName(reportData);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="flex flex-row items-center justify-between px-6 py-4 border-b bg-white">
            <SheetTitle className="sr-only">Report</SheetTitle>
            <SheetDescription className="sr-only">Astrological report data</SheetDescription>
            <div className="flex items-center gap-3">
            </div>
            <div></div>
          </SheetHeader>

          {/* View Toggle - Only show when both report and Swiss data are available */}
          {showToggle && (
            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setActiveView('report')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeView === 'report'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Report
              </button>
              <button
                onClick={() => setActiveView('astro')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeView === 'astro'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Astro Data
              </button>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {showToggle ? (
                // Show toggle-based content when both report and Swiss data are available
                activeView === 'report' ? (
                  <ReportContent
                    reportData={reportData}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isMobile={isMobile}
                  />
                ) : (
                  <div className="space-y-6">
                    <AstroDataRenderer swissData={reportData.swiss_data} reportData={reportData} />
                  </div>
                )
              ) : (
                // Show appropriate content based on what's available
                <ReportContent
                  reportData={reportData}
                  activeView={defaultView}
                  setActiveView={setActiveView}
                  isMobile={isMobile}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
