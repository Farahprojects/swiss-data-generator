import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, ArrowLeft, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ReportContent } from './ReportContent';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { getToggleDisplayLogic } from '@/utils/reportTypeUtils';
import { MappedReport } from '@/types/mappedReport';
import { extractAstroDataAsText } from '@/utils/astroTextExtractor';
import { ReportParser } from '@/utils/reportParser';
import { supabase } from '@/integrations/supabase/client';
import { getGuestReportId } from '@/utils/urlHelpers';
import { saveEnrichedSwissDataToEdge } from '@/utils/saveEnrichedSwissData';
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isCopping, setIsCopping] = useState(false);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [cachedUuid, setCachedUuid] = useState<string | null>(null);
  const [tempRowId, setTempRowId] = useState<string | null>(null);
  const hasSavedRef = useRef(false);

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

  // Fetch tempRowId when guestReportId is available
  useEffect(() => {
    const guestReportId = getGuestReportId();
    if (!guestReportId) return;

    console.log('🧠 Fetching tempRowId for guestReportId:', guestReportId);

    supabase
      .from('temp_report_data')
      .select('id')
      .eq('guest_report_id', guestReportId)
      .single()
      .then(({ data, error }) => {
        if (data?.id) {
          console.log('🧠 Found tempRowId:', data.id);
          setTempRowId(data.id);
        } else {
          console.log('❌ No tempRowId found:', error);
        }
      });
  }, []);

  // Handle Swiss data saving with the cleaner trigger approach
  useEffect(() => {
    const guestReportId = getGuestReportId();
    
    console.log('🧠 Swiss data saving effect triggered:', {
      hasSavedRef: hasSavedRef.current,
      hasSwissData: !!mappedReport?.swissData,
      hasGuestReportId: !!guestReportId,
      hasTempRowId: !!tempRowId
    });

    if (
      !hasSavedRef.current &&
      mappedReport?.swissData &&
      guestReportId &&
      tempRowId
    ) {
      hasSavedRef.current = true;

      console.log('🧠 Triggering saveEnrichedSwissDataToEdge from Report Modal');

      saveEnrichedSwissDataToEdge({
        uuid: tempRowId,
        swissData: mappedReport.swissData,
        table: 'temp_report_data',
        field: 'swiss_data'
      }).then((result) => {
        console.log('✅ Swiss data saved:', result);
      }).catch((err) => {
        console.error('❌ Swiss data save failed:', err);
        // Reset the flag on error to allow retry
        hasSavedRef.current = false;
      });
    }
  }, [mappedReport?.swissData, tempRowId]);

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
      const hasPdfData = !!mappedReport.pdfData;
      const hasSwissData = !!mappedReport.swissData;
      const hasReportContent = !!mappedReport.reportContent && mappedReport.reportContent.trim().length > 20;
      
      let textToCopy: string;
      let contentDescription: string;
      
      if ((hasPdfData && hasSwissData) || (hasReportContent && hasSwissData)) {
        // Both exist - copy unified content exactly like PDF generation
        const reportText = mappedReport.reportContent ? (() => {
          // Use the same ReportParser that PDF generation uses
          const blocks = ReportParser.parseReport(mappedReport.reportContent);
          return blocks.map(block => block.text).join('\n');
        })() : '';
        
        const astroText = extractAstroDataAsText(mappedReport.swissData, mappedReport);
        
        textToCopy = `${reportText}\n\n--- ASTROLOGICAL DATA ---\n\n${astroText}`;
        contentDescription = 'report and astro data';
      } else if (hasReportContent) {
        // Only report content - use same parser as PDF
        const blocks = ReportParser.parseReport(mappedReport.reportContent);
        textToCopy = blocks.map(block => block.text).join('\n');
        contentDescription = 'report';
      } else if (hasSwissData) {
        // Only astro data
        textToCopy = extractAstroDataAsText(mappedReport.swissData, mappedReport);
        contentDescription = 'astro data';
      } else {
        throw new Error('No content available to copy');
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setIsCopyCompleted(true);
      
      toast({
        title: "Copied to clipboard!",
        description: `Your ${contentDescription} has been copied and is ready to paste anywhere.`,
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
    // Always show the confirmation modal for both mobile and desktop
    setShowChatGPTConfirm(true);
  };

  const handleCloseSession = () => {
    setShowCloseConfirm(true);
  };

  const confirmCloseSession = () => {
    // Clear memory for new purchase
    setChatToken(null);
    setCachedUuid(null);
    setIsCopyCompleted(false);
    setShowCloseConfirm(false);
    onBack();
  };

  const handleChatGPTCopyAndGo = async () => {
    try {
      setIsCopping(true);

      let uuid = cachedUuid;
      let token = chatToken;

      // If not cached, fetch new token
      if (!chatToken || !cachedUuid) {
        toast({
          title: "Preparing ChatGPT...",
          description: "Fetching secure access token…",
        });

        /* 1. look up UUID from temp_report_data */
        const guestReportId = getGuestReportId();
        if (!guestReportId) throw new Error("Guest report ID not found");

        const { data: tempRow, error } = await supabase
          .from("temp_report_data")
          .select("id")
          .eq("guest_report_id", guestReportId)
          .single();

        if (error || !tempRow) throw new Error("Report row not found");
        uuid = tempRow.id;

        /* 2. call edge function → get token */
        const res = await fetch(
          "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/retrieve-temp-report",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid }),
          },
        );
        if (!res.ok) throw new Error("Edge function returned " + res.status);
        const result = await res.json();
        token = result.token;
        
        // Cache both token and uuid for subsequent calls
        setChatToken(token);
        setCachedUuid(uuid);
      }

      /* 3. Copy formatted message to clipboard */
      const formattedMessage = `uuid: ${uuid}\ntoken: ${token}`;
      
      try {
        await navigator.clipboard.writeText(formattedMessage);
        toast({
          title: "✅ Copied to clipboard!",
          description: "Now paste this in ChatGPT to load your report.",
        });
      } catch (clipboardError) {
        toast({
          title: "Opening ChatGPT...",
          description: "Ready to load your report!",
        });
      }

      /* 4. build ?message= param and open ChatGPT */
      const message = encodeURIComponent(formattedMessage);
      const gptUrl = `https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai?message=${message}`;

      setTimeout(() => {
        window.open(gptUrl, "_blank");
        setShowChatGPTConfirm(false);
        setIsCopping(false);
      }, 800);
    } catch (err) {
      console.error("ChatGPT setup failed:", err);
      toast({
        title: "ChatGPT integration failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsCopping(false);
      setShowChatGPTConfirm(false);
    }
  };

  // Apple-polished Mobile Layout
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Unified Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b bg-white shadow-sm">
            <Button variant="ghost" size="icon" onClick={handleCloseSession} className="p-2 hover:bg-gray-100 transition-colors active:scale-95">
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleChatGPT(); }}
                    className="text-gray-700 text-base font-medium hover:text-black transition-colors active:scale-95 flex items-center"
                  >
                    <img src={openaiLogo} alt="ChatGPT" className="h-5 w-5 mr-1" /> GPT
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Opens ChatGPT and copies your access token - paste it in the chat to load your report</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Shared Popups for Mobile */}
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
                    We'll copy your access token to clipboard and open ChatGPT. Simply paste the token in the chat to load your report.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleChatGPTCopyAndGo}
                    disabled={isCopping}
                    className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    {isCopping ? 'Opening...' : 'Go'}
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

        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 backdrop-blur-sm bg-black/20"
              onClick={() => setShowCloseConfirm(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-scale-in">
              <div className="text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Close Session
                  </h2>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Closing this will end your session. Any unsaved changes will be lost.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={confirmCloseSession}
                    className="h-12 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    Close Session
                  </button>
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="h-12 bg-gray-100 hover:bg-gray-200 text-gray-900 text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop layout
  return (
    <>
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
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="text-gray-700 text-base font-medium hover:text-black hover:bg-gray-100 transition-colors active:scale-95 border-gray-200"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                {(mappedReport.pdfData || mappedReport.swissData || (mappedReport.reportContent && mappedReport.reportContent.trim().length > 20)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (mappedReport.pdfData && mappedReport.swissData) {
                        handleDownloadUnifiedPdf();
                      } else if (mappedReport.pdfData) {
                        handleDownloadPdf();
                      } else if (mappedReport.swissData) {
                        handleDownloadUnifiedPdf();
                      } else if (mappedReport.reportContent && mappedReport.reportContent.trim().length > 20) {
                        handleDownloadUnifiedPdf();
                      }
                    }}
                    className="text-gray-700 text-base font-medium hover:text-black hover:bg-gray-100 transition-colors active:scale-95 border-gray-200"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleChatGPT(); }}
                        className="text-gray-700 text-base font-medium hover:text-black transition-colors active:scale-95 flex items-center border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-100"
                      >
                        <img 
                          src="/lovable-uploads/a27cf867-e7a3-4d2f-af1e-16aaa70117e4.png" 
                          alt="ChatGPT" 
                          className="h-4 w-4 mr-1"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0734a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'/%3E%3C/svg%3E";
                          }}
                        />
                        <span className="font-medium">ChatGPT</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Opens ChatGPT and copies your access token - paste it in the chat to load your report</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseSession}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
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

      {/* Shared Popups for Desktop */}
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
                  We'll copy your access token to clipboard and open ChatGPT. Simply paste the token in the chat to load your report.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleChatGPTCopyAndGo}
                  disabled={isCopping}
                  className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                >
                  {isCopping ? 'Opening...' : 'Go'}
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

      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 backdrop-blur-sm bg-black/20"
            onClick={() => setShowCloseConfirm(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-scale-in">
            <div className="text-center space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Close Session
                </h2>
                <p className="text-base text-gray-600 leading-relaxed">
                  Closing this will end your session. Any unsaved changes will be lost.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmCloseSession}
                  className="h-12 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                >
                  Close Session
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="h-12 bg-gray-100 hover:bg-gray-200 text-gray-900 text-lg font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};