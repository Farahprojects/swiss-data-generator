import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportContent } from './ReportContent';
import { supabase } from '@/integrations/supabase/client';
import { ReportData, extractReportContent, getPersonName } from '@/utils/reportContentExtraction';
import { renderAstroDataAsText, renderUnifiedContentAsText } from '@/utils/componentToTextRenderer';
import { useReportData } from '@/hooks/useReportData';
import { getChatTokens } from '@/services/auth/chatTokens';

interface ReportViewerProps {
  onBack: () => void;
  onStateReset?: () => void;
  isModal?: boolean;
  onLoad?: (error?: string | null) => void;
  shouldFetch?: boolean;
}

const ReportViewerActions: React.FC = () => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownload = async () => {
    const { uuid } = getChatTokens();
    if (!uuid) {
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Report ID is missing.' });
      return;
    }
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-report-pdf', { body: { guest_report_id: uuid } });
      if (error || !data) throw new Error(error?.message || 'No data');
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Therai-Report-${uuid.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download Failed', description: e.message || 'Please try again.' });
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="text-gray-700 border-gray-200">
      {isDownloading ? 'Downloading...' : 'PDF'}
    </Button>
  );
};

type TransitionPhase = 'idle' | 'fading' | 'clearing' | 'transitioning' | 'complete';

export const ReportViewer = ({ onBack, isModal = false, onLoad, shouldFetch = false }: ReportViewerProps) => {
  const { reportData, isLoading, error, fetchReport } = useReportData();
  const [activeView, setActiveView] = useState<'report' | 'astro'>('report');
  const isMobile = useIsMobile();

  // Only fetch when explicitly told to via shouldFetch prop
  useEffect(() => {
    if (shouldFetch) {
      const { uuid } = getChatTokens();
      if (uuid) {
        fetchReport(uuid);
          } else {
        console.warn('[ReportViewer] No persisted guest ID found');
      }
    }
  }, [shouldFetch, fetchReport]);

  useEffect(() => { if (!isLoading) onLoad?.(error); }, [isLoading, error, onLoad]);
  useEffect(() => {
    if (reportData) {
      const hasReportContent = !!reportData.report_content && reportData.report_content.trim().length > 20;
      const hasAstroData = !!reportData.swiss_data;
      setActiveView(hasReportContent ? 'report' : hasAstroData ? 'astro' : 'report');
    }
  }, [reportData]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
  }
  if (error || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h3 className="text-lg font-semibold text-red-600">Error Loading Report</h3>
        <p className="text-sm text-gray-600 mt-2">{error || 'The report could not be found.'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-sm bg-gray-200 rounded-md">Close</button>
      </div>
    );
  }

  const contentType = reportData?.metadata?.content_type;
  const showToggle = contentType === 'both';

  const personName = getPersonName(reportData);

  return (
    <>
      <div className={`bg-white z-50 flex flex-col transition-opacity duration-300 ${isModal ? 'relative w-full h-full' : 'fixed inset-0'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b bg-white shadow-sm">
          <div />
          <div className="flex items-center gap-3">
            <ReportViewerActions />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            <h1 className="text-xl font-light text-gray-900 mb-4">Generated for {personName}</h1>
            <ReportContent reportData={reportData} activeView={activeView} setActiveView={setActiveView} />
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
