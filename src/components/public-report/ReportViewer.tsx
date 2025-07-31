import React, { useState, useEffect } from 'react';
import { Download, Copy, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ReportContent } from './ReportContent';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { ReportParser } from '@/utils/reportParser';
import { supabase } from '@/integrations/supabase/client';
import { getGuestReportId, forceNavigationReset } from '@/utils/urlHelpers';
import openaiLogo from '@/assets/openai-logo.png';
import { ReportData, extractReportContent, getPersonName, getReportTitle } from '@/utils/reportContentExtraction';
import { renderAstroDataAsText, renderUnifiedContentAsText } from '@/utils/componentToTextRenderer';

interface ReportViewerProps {
  reportData: ReportData;
  onBack: () => void;
  onStateReset?: () => void;
}

type ModalType = 'chatgpt' | 'close' | null;
type TransitionPhase = 'idle' | 'fading' | 'clearing' | 'transitioning' | 'complete';

export const ReportViewer = ({ 
  reportData, 
  onBack, 
  onStateReset 
}: ReportViewerProps) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(
    reportData.metadata.content_type === 'ai' ? 'report' : 'astro'
  );
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [cachedUuid, setCachedUuid] = useState<string | null>(null);
  const [isCopping, setIsCopping] = useState(false);
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();

  // Determine view logic based on content type
  const contentType = reportData.metadata.content_type;
  const showToggle = contentType === 'both';
  const defaultView = contentType === 'ai' ? 'report' : contentType === 'astro' ? 'astro' : 'report';
  // Enforce content-based view restrictions
  useEffect(() => {
    if (!showToggle) {
      setActiveView(defaultView);
    }
  }, [showToggle, defaultView]);

  // Lock body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDownloadPdf = () => {
    // Check if there's PDF data in the report
    const pdfData = reportData.guest_report?.report_data?.report_pdf_base64;
    if (!pdfData) {
      return;
    }

    try {
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getPersonName(reportData).replace(/\s+/g, '_')}_Report.pdf`;
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

  const handleDownloadUnifiedPdf = async () => {
    const hasReportContent = !!reportData.report_content && reportData.report_content.trim().length > 20;
    const hasSwissData = !!reportData.swiss_data;

    if (!hasReportContent && !hasSwissData) {
      toast({
        title: "No data available",
        description: "Unable to generate PDF without report or astro data.",
        variant: "destructive"
      });
      return;
    }

    try {
      await PdfGenerator.generateUnifiedPdf({
        reportContent: reportData.report_content,
        swissData: reportData.swiss_data,
        customerName: getPersonName(reportData),
        reportPdfData: reportData.guest_report?.report_data?.report_pdf_base64,
        reportType: reportData.guest_report.report_type || ''
      });

      const sections = [];
      if (reportData.report_content) sections.push("AI Report");
      if (reportData.swiss_data) sections.push("Astro Data");
      
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

  // Smart PDF download logic
  const handleSmartPdfDownload = () => {
    const hasPdfData = !!reportData.guest_report?.report_data?.report_pdf_base64;
    const hasSwissData = !!reportData.swiss_data;
    const hasReportContent = !!reportData.report_content && reportData.report_content.trim().length > 20;

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

  const handleCopyToClipboard = async () => {
    try {
      let textToCopy: string;
      let contentDescription: string;
      
      switch (contentType) {
        case 'both':
          textToCopy = renderUnifiedContentAsText(reportData);
          contentDescription = 'report and astro data';
          break;
        case 'ai': {
          const blocks = ReportParser.parseReport(extractReportContent(reportData));
          textToCopy = blocks.map(block => block.text).join('\n');
          contentDescription = 'report';
          break;
        }
        case 'astro':
          textToCopy = renderAstroDataAsText(reportData);
          contentDescription = 'astro data';
          break;
        default:
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

  const handleCloseSession = async () => {
    if (isTransitioning) return;
    

    setIsTransitioning(true);
    
    try {
      // Phase 1: Fade out current content
      setTransitionPhase('fading');
      setActiveModal(null);
      
      // Wait for fade animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Phase 2: Show clearing state with visual feedback
      setTransitionPhase('clearing');
      
      // Reset component state gracefully
      setChatToken(null);
      setCachedUuid(null);
      setIsCopyCompleted(false);
      
      // Reset view state
      setActiveView(reportData.metadata.content_type === 'ai' ? 'report' : 
                   reportData.metadata.content_type === 'astro' ? 'astro' : 'report');
      
      // Phase 3: Background cleanup with visual progress
      setTransitionPhase('transitioning');
      
      // Prepare state reset callbacks
      const stateResetCallbacks: (() => void)[] = [];
      
      if (onStateReset) {
        stateResetCallbacks.push(onStateReset);
      }
      

      
      // Execute cleanup in background with visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Phase 4: Smooth navigation transition
      setTransitionPhase('complete');
      
      // Use enhanced force navigation reset with state callbacks
      await forceNavigationReset(stateResetCallbacks);
      
    } catch (error) {
      console.error('❌ Error during elegant session close:', error);
      
      // Graceful fallback
      try {
        window.location.href = '/';
      } catch (navError) {
        console.error('❌ Navigation fallback also failed:', navError);
        onBack();
      }
    } finally {
      setIsTransitioning(false);
      setTransitionPhase('idle');
    }
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
        setActiveModal(null);
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
      setActiveModal(null);
    }
  };

  return (
    <>
      {/* Transition Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
          <div className="text-center space-y-6 max-w-sm mx-auto px-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {transitionPhase === 'fading' && 'Closing Session'}
                {transitionPhase === 'clearing' && 'Clearing Data'}
                {transitionPhase === 'transitioning' && 'Resetting Form'}
                {transitionPhase === 'complete' && 'Redirecting'}
              </h3>
              <p className="text-gray-600 font-light">
                {transitionPhase === 'fading' && 'Preparing to clear your session...'}
                {transitionPhase === 'clearing' && 'Removing all session data...'}
                {transitionPhase === 'transitioning' && 'Setting up fresh form...'}
                {transitionPhase === 'complete' && 'Taking you to the new form...'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Full-screen overlay */}
      <div className={`fixed inset-0 bg-white z-50 flex flex-col transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
        {/* Header - Desktop only */}
        <div className="flex items-center justify-between px-4 py-4 border-b bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setActiveModal('close')} 
              className="p-2 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <X className="h-6 w-6 text-gray-700" />
            </Button>
            {showToggle && (
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
            
            {(reportData.guest_report?.report_data?.report_pdf_base64 || reportData.swiss_data || (reportData.report_content && reportData.report_content.trim().length > 20)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSmartPdfDownload}
                className="text-gray-700 text-base font-medium hover:text-black hover:bg-gray-100 transition-colors active:scale-95 border-gray-200"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveModal('chatgpt')}
                    className="text-gray-700 text-base font-medium hover:text-black hover:bg-gray-100 transition-colors active:scale-95 border-gray-200"
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
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Opens ChatGPT and copies your access token - paste it in the chat to load your report</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            <h1 className="text-xl font-light text-gray-900 mb-4">
              Generated for {getPersonName(reportData)}
            </h1>
            <ReportContent 
              reportData={reportData}
              activeView={activeView}
              setActiveView={setActiveView}
            />
          </div>
        </ScrollArea>
      </div>

      {/* ChatGPT Confirmation Modal */}
      <Dialog open={activeModal === 'chatgpt'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Analyze with ChatGPT
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
              We'll copy your access token to clipboard and open ChatGPT. Simply paste the token in the chat to load your report.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleChatGPTCopyAndGo}
              disabled={isCopping}
              className="h-12 text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {isCopping ? 'Opening...' : 'Go'}
            </Button>
            <Button
              onClick={() => setActiveModal(null)}
              disabled={isCopping}
              variant="outline"
              className="h-12 text-lg text-gray-900 font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98] border-gray-200"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Session Confirmation Modal */}
      <Dialog open={activeModal === 'close'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Close Session
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
              Closing this will end your session and clear all data. You'll return to a fresh form.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleCloseSession}
              disabled={isTransitioning}
              className="h-12 text-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {isTransitioning ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {transitionPhase === 'fading' && 'Closing...'}
                  {transitionPhase === 'clearing' && 'Clearing...'}
                  {transitionPhase === 'transitioning' && 'Resetting...'}
                  {transitionPhase === 'complete' && 'Redirecting...'}
                </div>
              ) : (
                'Close Session'
              )}
            </Button>
            <Button
              onClick={() => setActiveModal(null)}
              disabled={isTransitioning}
              variant="outline"
              className="h-12 text-lg text-gray-900 font-semibold rounded-full transition-all duration-200 ease-out active:scale-[0.98] border-gray-200 disabled:opacity-50"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
