import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, ArrowLeft, Copy, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportContent } from './ReportContent';
import { useToast } from '@/hooks/use-toast';

import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import openaiLogo from '@/assets/openai-logo.png';

interface MobileReportViewerProps {
  reportContent: string;
  reportPdfData?: string | null;
  customerName: string;
  swissData?: any;
  reportData?: any; // Form data containing names and birth details
  onBack: () => void;
  hasReport?: boolean;
  swissBoolean?: boolean;
}

const MobileReportViewer = ({ 
  reportContent, 
  reportPdfData, 
  customerName,
  swissData,
  reportData,
  onBack,
  hasReport,
  swissBoolean
}: MobileReportViewerProps) => {
  const { toast } = useToast();
  const [showChatGPTConfirm, setShowChatGPTConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeView, setActiveView] = useState<'report' | 'astro'>('report');

  const reportAnalysisData = { reportContent, swissData, swissBoolean, hasReport };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);

  const handleDownloadPdf = () => {
    if (!reportPdfData) {
      return;
    }

    try {
      const byteCharacters = atob(reportPdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
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
    }
  };

  const handleCopyToClipboard = async () => {
    try {
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
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportContent;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      await navigator.clipboard.writeText(cleanText);
      toast({
        title: "Copied!",
        description: "Report copied to clipboard",
      });
      setTimeout(() => {
        const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report and provide additional insights or answer any questions I might have:\n\n${cleanText}`)}`;
        window.open(chatGPTUrl, '_blank');
        setShowChatGPTConfirm(false);
        setIsCopping(false);
      }, 2000);
    } catch (error) {
      setIsCopping(false);
      toast({
        title: "Copy failed",
        description: "Unable to copy. Please try manually.",
        variant: "destructive"
      });
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
        reportType: undefined // mobile doesn't have reportType
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
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-center relative px-6 py-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-6 p-2 hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <div className="absolute right-6 flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopyToClipboard} className="p-2 hover:bg-gray-50">
              <Copy className="h-5 w-5 text-gray-700" />
            </Button>
            {(reportPdfData || swissData || (reportContent && reportContent.trim().length > 20)) && (
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={isDownloading}
                onClick={() => {
                  if (reportPdfData && swissData) {
                    handleDownloadUnifiedPdf(); // Combined version
                  } else if (reportPdfData) {
                    handleDownloadPdf();
                  } else if (swissData) {
                    handleDownloadUnifiedPdf();
                  } else if (reportContent && reportContent.trim().length > 20) {
                    handleDownloadUnifiedPdf(); // Use unified PDF for AI content
                  }
                }}
                className="p-2 hover:bg-gray-50"
              >
                <Download className="h-5 w-5 text-gray-700" />
              </Button>
            )}
          </div>
        </div>

        {toggleLogic.showToggle && (
          <div className="px-6 pb-4">
            <div className="inline-flex bg-gray-100 rounded-full p-1 w-fit mx-auto">
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
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-6">
          <h1 className="text-xl font-light text-gray-900 tracking-tight mb-3">
            {toggleLogic.title} — Generated for {customerName}
          </h1>
          <ReportContent 
            reportContent={reportContent} 
            swissData={swissData}
            reportData={reportData}
            customerName={customerName}
            hasReport={hasReport}
            swissBoolean={swissBoolean}
            activeView={activeView}
            setActiveView={setActiveView}
            isMobile={true}
          />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="bg-white border-t border-gray-100 px-6 py-5 shadow-lg flex-shrink-0">
        <div className="flex gap-8 justify-center">
          <button onClick={handleCopyToClipboard} className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300">
            <Paperclip className="h-5 w-5 mr-2" />
            Copy
          </button>
          <button onClick={handleChatGPT} className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300">
            <img src={openaiLogo} alt="ChatGPT" className="h-5 w-5 mr-2" />
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
    </div>
  );
};

export default MobileReportViewer;
