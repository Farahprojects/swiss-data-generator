
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { ReportHeader } from './ReportHeader';
import { ReportContent } from './ReportContent';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  reportData?: any; // Form data containing names and birth details
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
  reportData,
  onBack,
  hasReport,
  swissBoolean,
  reportType
}: DesktopReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Use intelligent content detection
  const reportAnalysisData = { reportContent, swissData, swissBoolean, hasReport };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(toggleLogic.defaultView);
  
  const isPureAstroReport = toggleLogic.availableViews.length === 1 && toggleLogic.availableViews[0] === 'astro';

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
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
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please try copying manually first.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDownloadUnifiedPdf = async () => {
    // Guard: Check if we have either report content or astro data
    if (!reportContent && !swissData) {
      toast({
        title: "Missing data",
        description: "Nothing to generate.",
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple simultaneous downloads
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      
      // Pass fresh, correct props directly - no recalculation
      await PdfGenerator.generateUnifiedPdf({
        reportContent: reportContent, // already styled HTML string
        swissData: swissData,
        customerName: customerName,   // direct from form, cleaned
        reportPdfData: reportPdfData,
        reportType: reportType
      });

      // Determine what was included for success message
      const sections = [];
      if (reportContent) sections.push("AI Report");
      if (swissData) sections.push("Astro Data");
      
      toast({
        title: "PDF Downloaded!",
        description: `Your ${sections.join(" + ")} report has been downloaded.`,
      });
      
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF generation failed",
        description: error?.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
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
        isDownloading={isDownloading}
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
        reportData={reportData}
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
