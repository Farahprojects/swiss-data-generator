
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { logToAdmin } from '@/utils/adminLogger';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { ReportHeader } from './ReportHeader';
import { ReportContent } from './ReportContent';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  onBack: () => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
  reportType?: string;
}

const DesktopReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  swissData,
  onBack,
  hasReport,
  swissBoolean,
  reportType
}: DesktopReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  
  // Use intelligent content detection
  const reportData = { reportContent, swissData, swissBoolean, hasReport };
  const toggleLogic = getToggleDisplayLogic(reportData);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(toggleLogic.defaultView);
  
  const isPureAstroReport = toggleLogic.availableViews.length === 1 && toggleLogic.availableViews[0] === 'astro';

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      logToAdmin('DesktopReportViewer', 'pdf_download_warning', 'No PDF data available for download', {
        customerName: customerName
      });
      return;
    }

    try {
      // Create blob from base64 data
      const byteCharacters = atob(reportPdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
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
      // Clean the HTML content to get plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(cleanText);
      
      // Enable ChatGPT button after successful copy
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
      // Copy the report first
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
        
        // Wait 2 seconds then redirect to ChatGPT
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

  const handleDownloadUnifiedPdf = async () => {
    // Check if we have either report content or astro data
    if (!reportContent && !swissData) {
      toast({
        title: "No data available",
        description: "Unable to generate PDF without report or astro data.",
        variant: "destructive"
      });
      return;
    }

    try {
      await PdfGenerator.generateUnifiedPdf({
        reportContent: reportContent,
        swissData: swissData,
        customerName: customerName,
        reportPdfData: reportPdfData,
        reportType: reportType
      });

      // Determine what was included for the toast message
      const sections = [];
      if (reportContent) sections.push("AI Report");
      if (swissData) sections.push("Astro Data");
      
      toast({
        title: "PDF Generated!",
        description: `Your ${sections.join(" + ")} PDF has been downloaded.`,
      });
    } catch (error) {
      logToAdmin('DesktopReportViewer', 'unified_pdf_error', 'Error generating unified PDF', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        hasReportContent: !!reportContent,
        hasSwissData: !!swissData
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
      style={{ pointerEvents: 'auto' }}
      className="min-h-screen bg-background"
    >
      <ReportHeader
        customerName={customerName || 'there'}
        onBack={onBack}
        onCopyToClipboard={handleCopyToClipboard}
        onDownloadPdf={handleDownloadPdf}
        onDownloadAstroPdf={handleDownloadUnifiedPdf}
        onChatGPTClick={handleChatGPTClick}
        reportPdfData={reportPdfData}
        isCopyCompleted={isCopyCompleted}
        swissData={swissData}
        reportContent={reportContent}
        activeView={activeView}
        setActiveView={setActiveView}
        hasReport={hasReport}
        swissBoolean={swissBoolean}
        isPureAstroReport={isPureAstroReport}
      />

      <ReportContent 
        reportContent={reportContent} 
        swissData={swissData} 
        customerName={customerName} 
        activeView={activeView} 
        setActiveView={setActiveView}
        hasReport={hasReport}
        swissBoolean={swissBoolean}
        isPureAstroReport={isPureAstroReport}
      />
    </motion.div>
  );
};

export default DesktopReportViewer;
