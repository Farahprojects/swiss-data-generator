
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { logToAdmin } from '@/utils/adminLogger';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { ReportHeader } from './ReportHeader';
import { ReportContent } from './ReportContent';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  onBack: () => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
}

const DesktopReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  swissData,
  onBack,
  hasReport,
  swissBoolean
}: DesktopReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  
  // Determine if this is a pure astro report (no AI content)
  const isPureAstroReport = swissData && (!reportContent || reportContent.trim() === '');
  const defaultView = isPureAstroReport ? 'astro' : 'report';
  const [activeView, setActiveView] = useState<'report' | 'astro'>(defaultView);

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
        customerName: customerName,
        swissData: swissData,
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
