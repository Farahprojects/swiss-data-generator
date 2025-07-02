
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { ReportHeader } from './ReportHeader';
import { ReportContent } from './ReportContent';
import { ReportActions } from './ReportActions';

interface DesktopReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  onBack: () => void;
}

const DesktopReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  onBack 
}: DesktopReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      console.warn('No PDF data available for download');
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
      console.error('❌ Error downloading PDF:', error);
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
      console.error('❌ Error copying to clipboard:', error);
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
        console.error('❌ Error copying to clipboard:', error);
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please try copying manually first.",
          variant: "destructive"
        });
      }
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
        onChatGPTClick={handleChatGPTClick}
        reportPdfData={reportPdfData}
        isCopyCompleted={isCopyCompleted}
      />

      <ReportContent reportContent={reportContent} />

      <div className="max-w-4xl mx-auto px-4">
        <ReportActions
          onCopyToClipboard={handleCopyToClipboard}
          onDownloadPdf={handleDownloadPdf}
          onChatGPTClick={handleChatGPTClick}
          reportPdfData={reportPdfData}
          isCopyCompleted={isCopyCompleted}
        />
      </div>
    </motion.div>
  );
};

export default DesktopReportViewer;
