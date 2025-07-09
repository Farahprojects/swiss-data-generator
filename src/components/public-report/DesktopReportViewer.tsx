import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { logToAdmin } from '@/utils/adminLogger';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { ReportHeader } from './ReportHeader';
import { ReportContent } from './ReportContent';
import { supabase } from '@/lib/supabaseClient';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  onBack: () => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
  reportId: string; // ✅ Required for listening
}

const DesktopReportViewer = ({
  reportContent,
  reportPdfData,
  customerName,
  swissData,
  onBack,
  hasReport,
  swissBoolean,
  reportId
}: DesktopReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);

  const isPureAstroReport = swissData && (!reportContent || reportContent.trim() === '');
  const defaultView = (isPureAstroReport || swissBoolean) ? 'astro' : 'report';
  const [activeView, setActiveView] = useState<'report' | 'astro'>(defaultView);

  const [isSwissEnforced, setIsSwissEnforced] = useState(swissBoolean ?? false);

  // ✅ Listen for guest_reports.swiss_only becoming true
  useEffect(() => {
    if (isSwissEnforced || !reportId) return;

    const channel = supabase
      .channel(`watch-swiss-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_reports',
          filter: `id=eq.${reportId}`
        },
        (payload) => {
          const updated = payload.new;
          if (updated?.swiss_only === true) {
            setIsSwissEnforced(true);
            setActiveView('astro');
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId, isSwissEnforced]);

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      logToAdmin('DesktopReportViewer', 'pdf_download_warning', 'No PDF data available for download', {
        customerName
      });
      return;
    }

    try {
      const byteCharacters = atob(reportPdfData);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customerName.replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      logToAdmin('DesktopReportViewer', 'pdf_download_error', 'Error downloading PDF', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      await navigator.clipboard.writeText(cleanText);

      setIsCopyCompleted(true);
      toast({
        title: "Copied to clipboard!",
        description: "Your report has been copied and is ready to paste anywhere.",
      });

    } catch (error) {
      logToAdmin('DesktopReportViewer', 'clipboard_copy_error', 'Error copying to clipboard', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try selecting and copying the text manually.",
        variant: "destructive"
      });
    }
  };

  const handleChatGPTClick = async () => {
    if (isCopyCompleted) {
      window.open('https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai', '_blank');
    } else {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reportContent;
        const cleanText = tempDiv.textContent || tempDiv.innerText || '';
        await navigator.clipboard.writeText(cleanText);

        setIsCopyCompleted(true);
        toast({
          title: "Report copied to clipboard!",
          description: "Redirecting to ChatGPT..."
        });

        setTimeout(() => {
          window.open('https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai', '_blank');
        }, 2000);

      } catch (error) {
        logToAdmin('DesktopReportViewer', 'clipboard_copy_error_fallback', 'Error copying to clipboard fallback', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : null
        });
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please try copying manually first.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDownloadAstroPdf = async () => {
    if (!swissData) {
      toast({
        title: "No astro data available",
        description: "Unable to generate PDF without astro data.",
        variant: "destructive"
      });
      return;
    }

    try {
      await PdfGenerator.generateAstroPdf({
        id: Math.random().toString(36).substring(7),
        title: 'Astro Data Report',
        customerName,
        swissData,
        metadata: {
          generatedAt: new Date().toLocaleString(),
          reportType: 'astro'
        }
      });

      toast({
        title: "PDF Generated!",
        description: "Your astro data PDF has been downloaded.",
      });

    } catch (error) {
      logToAdmin('DesktopReportViewer', 'astro_pdf_error', 'Error generating astro PDF', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
      toast({
        title: "PDF generation failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      <ReportHeader
        customerName={customerName}
        onBack={onBack}
        onCopyToClipboard={handleCopyToClipboard}
        onDownloadPdf={handleDownloadPdf}
        onDownloadAstroPdf={handleDownloadAstroPdf}
        onChatGPTClick={handleChatGPTClick}
        reportPdfData={reportPdfData}
        isCopyCompleted={isCopyCompleted}
        swissData={swissData}
        reportContent={reportContent}
        hasReport={hasReport}
        swissBoolean={isSwissEnforced}
        isPureAstroReport={isPureAstroReport}
        {...(!isSwissEnforced && {
          activeView,
          setActiveView,
        })}
      />

      <ReportContent
        reportContent={reportContent}
        swissData={swissData}
        customerName={customerName}
        hasReport={hasReport}
        swissBoolean={isSwissEnforced}
        isPureAstroReport={isPureAstroReport}
        {...(!isSwissEnforced && {
          activeView,
          setActiveView,
        })}
      />
    </motion.div>
  );
};

export default DesktopReportViewer;

