import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, ArrowLeft, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ReportContent } from './ReportContent';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
import { MappedReport } from '@/types/mappedReport';
import { extractAstroDataAsText } from '@/utils/astroTextExtractor';
import { supabase } from '@/integrations/supabase/client';
import openaiLogo from '@/assets/openai-logo.png';

interface ReportViewerProps {
  mappedReport: MappedReport;
  onBack: () => void;
  isMobile?: boolean;
}

export const ReportViewer = ({ mappedReport, onBack, isMobile = false }: ReportViewerProps) => {
  const { toast } = useToast();
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  const [showChatGPTConfirm, setShowChatGPTConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);

  // Use intelligent content detection
  const reportAnalysisData = { 
    reportContent: mappedReport.reportContent, 
    swissData: mappedReport.swissData, 
    swissBoolean: mappedReport.swissBoolean, 
    hasReport: mappedReport.hasReport 
  };
  const toggleLogic = getToggleDisplayLogic(reportAnalysisData);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(toggleLogic.defaultView);

  // Enforce content-based view restrictions
  useEffect(() => {
    if (!toggleLogic.showToggle) {
      setActiveView(toggleLogic.defaultView);
    }
  }, [toggleLogic.showToggle, toggleLogic.defaultView]);

  const handleDownloadPdf = () => {
    if (!mappedReport.pdfData) {
      return;
    }

    try {
      const byteCharacters = atob(mappedReport.pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mappedReport.customerName.replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Smart PDF download logic that matches desktop behavior
  const handleSmartPdfDownload = () => {
    const hasPdfData = !!mappedReport.pdfData;
    const hasSwissData = !!mappedReport.swissData;
    const hasReportContent = !!mappedReport.reportContent && mappedReport.reportContent.trim().length > 20;

    if (hasPdfData && hasSwissData) {
      // Both exist - generate unified PDF
      handleDownloadUnifiedPdf();
    } else if (hasPdfData) {
      // Only PDF exists - use simple download
      handleDownloadPdf();
    } else if (hasSwissData || hasReportContent) {
      // Only Swiss data or report content exists - generate unified PDF
      handleDownloadUnifiedPdf();
    }
  };

  const handleDownloadUnifiedPdf = async () => {
    if (!mappedReport.reportContent && !mappedReport.swissData) {
      toast({
        title: "No data available",
        description: "Unable to generate PDF without report or astro data.",
        variant: "destructive"
      });
      return;
    }

    try {
      await PdfGenerator.generateUnifiedPdf({
        reportContent: mappedReport.reportContent,
        swissData: mappedReport.swissData,
        customerName: mappedReport.customerName,
        reportPdfData: mappedReport.pdfData,
        reportType: mappedReport.reportType
      });

      const sections = [];
      if (mappedReport.reportContent) sections.push("AI Report");
      if (mappedReport.swissData) sections.push("Astro Data");
      
      toast({
        title: "PDF Generated!",
        description: `Your ${sections.join(" + ")} PDF has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "PDF generation failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      let textToCopy: string;
      
      if (activeView === 'astro' && mappedReport.swissData) {
        // Copy astro data as formatted text
        textToCopy = extractAstroDataAsText(mappedReport.swissData, mappedReport);
      } else {
        // Copy report content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = mappedReport.reportContent;
        textToCopy = tempDiv.textContent || tempDiv.innerText || '';
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setIsCopyCompleted(true);
      
      toast({
        title: "Copied to clipboard!",
        description: `Your ${activeView === 'astro' ? 'astro data' : 'report'} has been copied and is ready to paste anywhere.`,
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
    if (isMobile) {
      setShowChatGPTConfirm(true);
    } else {
      handleChatGPTDesktop();
    }
  };

  const handleChatGPTDesktop = async () => {
    if (isCopyCompleted) {
      window.open('https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai', '_blank');
    } else {
      try {
        let textToCopy: string;
        
        if (activeView === 'astro' && mappedReport.swissData) {
          textToCopy = extractAstroDataAsText(mappedReport.swissData, mappedReport);
        } else {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = mappedReport.reportContent;
          textToCopy = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        await navigator.clipboard.writeText(textToCopy);
        setIsCopyCompleted(true);
        
        toast({
          title: `${activeView === 'astro' ? 'Astro data' : 'Report'} copied to clipboard!`,
          description: "Redirecting to ChatGPT..."
        });
        
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

  const handleChatGPTCopyAndGo = async () => {
    try {
      setIsCopping(true);
      
      toast({
        title: "Preparing ChatGPT...",
        description: "Storing report data...",
      });

      // Store the complete report data temporarily
      const response = await supabase.functions.invoke('store-temp-report', {
        body: mappedReport
      });

      if (response.error) {
        throw new Error('Failed to store report data');
      }

      const { uuid } = response.data;
      
      toast({
        title: "Opening ChatGPT...",
        description: "Report data prepared successfully!",
      });
      
      setTimeout(() => {
        // Open ChatGPT with the UUID parameter
        window.open(`https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai?data=${uuid}`, '_blank');
        setShowChatGPTConfirm(false);
        setIsCopping(false);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to prepare ChatGPT integration:', error);
      
      // Fallback to clipboard method
      toast({
        title: "Using fallback method",
        description: "Copying to clipboard instead...",
        variant: "destructive",
      });

      try {
        let textToCopy: string;
        
        if (activeView === 'astro' && mappedReport.swissData) {
          textToCopy = `Please analyze this astrological data and provide additional insights or answer any questions I might have, read it like an energy map not a horoscope:\n\n${extractAstroDataAsText(mappedReport.swissData, mappedReport)}`;
        } else {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = mappedReport.reportContent;
          const reportText = tempDiv.textContent || tempDiv.innerText || '';
          textToCopy = `Please analyze this astrological report and provide additional insights or answer any questions I might have, read it like an energy map not a horoscope:\n\n${reportText}`;
        }
        
        await navigator.clipboard.writeText(textToCopy);
        
        setTimeout(() => {
          window.open('https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai', '_blank');
          setShowChatGPTConfirm(false);
          setIsCopping(false);
        }, 1500);
        
      } catch (clipboardError) {
        console.error('Clipboard fallback also failed:', clipboardError);
        toast({
          title: "Integration failed",
          description: "Please try again",
          variant: "destructive",
        });
        setIsCopping(false);
      }
    }
  };

  // Apple-polished Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Unified Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b bg-white shadow-sm">
          <Button variant="ghost" size="icon" onClick={onBack} className="p-2 hover:bg-gray-100 transition-colors active:scale-95">
            <X className="h-6 w-6 text-gray-700" />
          </Button>
          {toggleLogic.showToggle && (
            <div className="flex space-x-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveView('report')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeView === 'report' ? 'bg-white text-black shadow' : 'text-gray-600 hover:text-black'
                }`}
              >
                Report
              </button>
              <button
                onClick={() => setActiveView('astro')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeView === 'astro' ? 'bg-white text-black shadow' : 'text-gray-600 hover:text-black'
                }`}
              >
                Astro
              </button>
            </div>
          )}
          {(mappedReport.pdfData || mappedReport.swissData || (mappedReport.reportContent && mappedReport.reportContent.trim().length > 20)) && (
            <Button variant="ghost" size="icon" onClick={handleSmartPdfDownload} className="p-2 hover:bg-gray-100 transition-colors active:scale-95">
              <Download className="h-5 w-5 text-gray-700" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h1 className="text-xl font-light text-gray-900 mb-4">
            {toggleLogic.title} — Generated for {mappedReport.customerName}
          </h1>
          <ReportContent 
            mappedReport={mappedReport}
            activeView={activeView}
            setActiveView={setActiveView}
            isMobile
          />
        </div>

        {/* Footer with 2 buttons */}
        <div className="px-6 py-4 border-t bg-white shadow-md flex justify-center gap-6">
          <Button variant="ghost" onClick={handleCopyToClipboard} className="text-gray-700 text-base font-medium hover:text-black transition-colors active:scale-95">
            <Paperclip className="h-5 w-5 mr-1" /> Copy
          </Button>
          <Button variant="ghost" onClick={handleChatGPT} className="text-gray-700 text-base font-medium hover:text-black transition-colors active:scale-95">
            <img src={openaiLogo} alt="ChatGPT" className="h-5 w-5 mr-1" /> GPT
          </Button>
        </div>

        {/* Apple-style ChatGPT Confirmation Popup */}
        {showChatGPTConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 backdrop-blur-sm bg-black/20"
              onClick={() => setShowChatGPTConfirm(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-scale-in">
              <div className="text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Analyze with ChatGPT
                  </h2>
                  <p className="text-base text-gray-600 leading-relaxed">
                    We'll copy your report to clipboard and open ChatGPT for you.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleChatGPTCopyAndGo}
                    disabled={isCopping}
                    className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    {isCopping ? 'Copied!' : 'Copy & Go'}
                  </button>
                  <button
                    onClick={() => setShowChatGPTConfirm(false)}
                    disabled={isCopping}
                    className="h-12 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-900 text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ pointerEvents: 'auto' }}
      className="min-h-screen bg-background"
    >
      {/* Desktop Header */}
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
              {toggleLogic.showToggle && (
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
                onClick={handleCopyToClipboard}
                onMouseDown={handleCopyToClipboard}
                tabIndex={0}
                style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                className="flex items-center gap-2 pointer-events-auto !cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              {(mappedReport.pdfData || mappedReport.swissData || (mappedReport.reportContent && mappedReport.reportContent.trim().length > 20)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (mappedReport.pdfData && mappedReport.swissData) {
                      handleDownloadUnifiedPdf(); // Combined version
                    } else if (mappedReport.pdfData) {
                      handleDownloadPdf();
                    } else if (mappedReport.swissData) {
                      handleDownloadUnifiedPdf();
                    } else if (mappedReport.reportContent && mappedReport.reportContent.trim().length > 20) {
                      handleDownloadUnifiedPdf(); // Use unified PDF for AI content
                    }
                  }}
                  tabIndex={0}
                  style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                  className="flex items-center gap-2 pointer-events-auto !cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleChatGPT}
                onMouseDown={handleChatGPT}
                tabIndex={0}
                style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md font-inter transition-all duration-200 pointer-events-auto !cursor-pointer"
              >
                <img 
                  src="/lovable-uploads/a27cf867-e7a3-4d2f-af1e-16aaa70117e4.png" 
                  alt="ChatGPT" 
                  className="h-4 w-4"
                  onError={(e) => {
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

      <ReportContent 
        mappedReport={mappedReport}
        activeView={activeView} 
        setActiveView={setActiveView}
      />
    </motion.div>
  );
};