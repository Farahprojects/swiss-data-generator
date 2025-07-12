
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Copy, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportContent } from './ReportContent';
import { useToast } from '@/hooks/use-toast';
import { logToAdmin } from '@/utils/adminLogger';
import openaiLogo from '@/assets/openai-logo.png';

interface MobileReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  onBack: () => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
}

const MobileReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  swissData,
  onBack,
  hasReport,
  swissBoolean
}: MobileReportViewerProps) => {
  const { toast } = useToast();
  const [showChatGPTConfirm, setShowChatGPTConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      logToAdmin('MobileReportViewer', 'pdf_download_warning', 'No PDF data available for download', {
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
      logToAdmin('MobileReportViewer', 'pdf_download_error', 'Error downloading PDF', {
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
      
      toast({
        title: "Copied to clipboard!",
        description: "Your report has been copied and is ready to paste anywhere.",
        variant: "success"
      });
      
      
    } catch (error) {
      logToAdmin('MobileReportViewer', 'clipboard_copy_error', 'Error copying to clipboard', {
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

  const handleChatGPT = () => {
    setShowChatGPTConfirm(true);
  };

  const handleChatGPTCopyAndGo = async () => {
    setIsCopping(true);
    
    try {
      // Clean the HTML content to get plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(cleanText);
      
      // Show "Copied" for 2 seconds
      toast({
        title: "Copied!",
        description: "Report copied to clipboard",
      });
      
      // Wait 2 seconds then redirect
      setTimeout(() => {
        const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report and provide additional insights or answer any questions I might have:\n\n${cleanText}`)}`;
        window.open(chatGPTUrl, '_blank');
        setShowChatGPTConfirm(false);
        setIsCopping(false);
      }, 2000);
      
    } catch (error) {
      logToAdmin('MobileReportViewer', 'clipboard_copy_error_fallback', 'Error copying to clipboard fallback', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
      setIsCopping(false);
      toast({
        title: "Copy failed",
        description: "Unable to copy. Please try manually.",
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
      className="flex flex-col h-screen bg-white"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-center relative px-6 py-4 bg-white border-b border-gray-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute left-6 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
        <div className="absolute right-6 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyToClipboard}
            className="p-2 hover:bg-gray-50"
          >
            <Copy className="h-5 w-5 text-gray-700" />
          </Button>
          {reportPdfData && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadPdf}
              className="p-2 hover:bg-gray-50"
            >
              <Download className="h-5 w-5 text-gray-700" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <ReportContent 
            reportContent={reportContent} 
            swissData={swissData} 
            customerName={customerName}
            hasReport={hasReport}
            swissBoolean={swissBoolean}
            isMobile={true}
          />
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 px-6 py-4">
        <div className="flex gap-8 justify-center">
          <button 
            onClick={handleCopyToClipboard}
            className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
          >
            <Paperclip className="h-5 w-5 mr-2" />
            Copy
          </button>
          <button 
            onClick={handleChatGPT}
            className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
          >
            <img 
              src={openaiLogo} 
              alt="ChatGPT" 
              className="h-5 w-5 mr-2"
            />
            GPT
          </button>
        </div>
      </div>

      {/* ChatGPT Confirmation Dialog */}
      <Dialog open={showChatGPTConfirm} onOpenChange={setShowChatGPTConfirm}>
        <DialogContent className="mx-6 rounded-xl">
          <DialogHeader className="text-center space-y-4">
            <DialogTitle className="text-2xl font-light text-gray-900 tracking-tight">
              Analyze with <em className="italic font-light">ChatGPT</em>
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-500 font-light leading-relaxed">
              Ready to get AI insights on your report? We'll copy your report to clipboard and open ChatGPT for analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setShowChatGPTConfirm(false)}
              className="flex-1 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl text-lg font-light hover:bg-gray-200 transition-all duration-300"
              disabled={isCopping}
            >
              Cancel
            </button>
            <button
              onClick={handleChatGPTCopyAndGo}
              className="flex-1 bg-gray-900 text-white px-8 py-4 rounded-xl text-lg font-light hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
              disabled={isCopping}
            >
              {isCopping ? "Copied!" : "Copy & Go"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MobileReportViewer;
