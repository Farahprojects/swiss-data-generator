import React, { useState, useEffect } from 'react';
import { Download, Copy, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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

type ModalType = 'chatgpt' | 'close' | 'ai-choice' | 'email' | null;
type TransitionPhase = 'idle' | 'fading' | 'clearing' | 'transitioning' | 'complete';

export const ReportViewer = ({ 
  reportData, 
  onBack, 
  onStateReset 
}: ReportViewerProps) => {
  const mountStartTime = performance.now();
  console.info('[ReportViewer] 🚀 Starting ReportViewer mount...');
  console.info('[ReportViewer] mounted with data.id =', reportData?.guest_report?.id);
  const isMobile = useIsMobile();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeView, setActiveView] = useState<'report' | 'astro'>(() => {
    // Prioritize report content over astro data from initial state
    const hasReportContent = !!reportData.report_content && reportData.report_content.trim().length > 20;
    const hasAstroData = !!reportData.swiss_data;
    
    // Default to report if available, otherwise astro data
    return hasReportContent ? 'report' : hasAstroData ? 'astro' : 'report';
  });
  const [isCopping, setIsCopping] = useState(false);
  const [isCopyCompleted, setIsCopyCompleted] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [chatGPTMessage, setChatGPTMessage] = useState<string>('');
  const [hasChosenAIPath, setHasChosenAIPath] = useState(false);
  const [genericCopySuccess, setGenericCopySuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { toast } = useToast();

  // Determine view logic based on content type
  const contentType = reportData.metadata.content_type;
  const showToggle = contentType === 'both';
  
  // Prioritize report content over astro data
  const hasReportContent = !!reportData.report_content && reportData.report_content.trim().length > 20;
  const hasAstroData = !!reportData.swiss_data;
  
  // Default to report if available, otherwise astro data
  const defaultView = hasReportContent ? 'report' : hasAstroData ? 'astro' : 'report';
  
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
      // setChatToken(null); // Removed
      // setCachedUuid(null); // Removed
      setIsCopyCompleted(false);
      
      // Reset view state
      setActiveView(reportData.metadata.content_type === 'ai' ? 'report' : 
                   reportData.metadata.content_type === 'astro' ? 'astro' : 'report');
      
      // Phase 3: Background cleanup with visual progress
      setTransitionPhase('transitioning');
      
      // Use SessionManager for comprehensive session clearing
      const { sessionManager } = await import('@/utils/sessionManager');
      
      // Execute professional session clearing
      await sessionManager.clearSession({
        showProgress: true,
        redirectTo: '/',
        preserveNavigation: false
      });
      
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
      console.log('[ChatGPT] Starting ChatGPT integration...');

      // Debug clipboard permissions on mobile
      try {
        const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
        console.log('[ChatGPT] Clipboard permission state:', permission.state);
      } catch (permError) {
        console.log('[ChatGPT] Could not check clipboard permission:', permError);
      }

      toast({
        title: "Preparing ChatGPT...",
        description: "Fetching secure access token…",
      });

      /* 1. Get guest report ID from the current report data */
      const guestReportId = reportData.guest_report?.id;
      console.log('[ChatGPT] Guest report ID:', guestReportId);
      if (!guestReportId) throw new Error("Guest report ID not found");

      /* 2. Always call create-temp-report-data to get fresh keys */
      console.log('[ChatGPT] Fetching temp report data...');
      toast({
        title: "Preparing ChatGPT...",
        description: "Creating temporary data...",
      });
      
      const createResponse = await fetch(
        "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/create-temp-report-data",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_report_id: guestReportId }),
        }
      );
      
      if (!createResponse.ok) {
        throw new Error("Failed to create temp report data");
      }
      
      const createResult = await createResponse.json();
      console.log('[ChatGPT] Create temp data result:', createResult);
      
      const uuid = createResult.temp_data_id;
      const token = createResult.plain_token;
      
      console.log('[ChatGPT] ✅ Retrieved data from create-temp-report-data:', {
        uuid: uuid,
        has_token: !!token,
        has_chat_hash: !!createResult.chat_hash
      });

      /* 3. Copy formatted message to clipboard - do this immediately after getting data */
      const formattedMessage = `uuid: ${uuid}\ntoken: ${token}`;
      console.log('[ChatGPT] Formatted message:', formattedMessage);
      
      // Store message for manual copying
      setChatGPTMessage(formattedMessage);
      
      // Try clipboard copy immediately after getting the data
      let clipboardSuccess = false;
      try {
        await navigator.clipboard.writeText(formattedMessage);
        console.log('[ChatGPT] ✅ Clipboard copy successful');
        clipboardSuccess = true;
        toast({
          title: "✅ Copied to clipboard!",
          description: "Now paste this in ChatGPT to load your report.",
        });
      } catch (clipboardError) {
        console.error('[ChatGPT] ❌ Clipboard error:', clipboardError);
        clipboardSuccess = false;
        
        // Fallback for mobile browsers
        try {
          // Create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = formattedMessage;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            console.log('[ChatGPT] ✅ Fallback clipboard copy successful');
            clipboardSuccess = true;
            toast({
              title: "✅ Copied to clipboard!",
              description: "Now paste this in ChatGPT to load your report.",
            });
          } else {
            console.error('[ChatGPT] ❌ Fallback clipboard also failed');
            toast({
              title: "Opening ChatGPT...",
              description: "Ready to load your report!",
            });
          }
        } catch (fallbackError) {
          console.error('[ChatGPT] ❌ Fallback clipboard error:', fallbackError);
          toast({
            title: "Opening ChatGPT...",
            description: "Ready to load your report!",
          });
        }
      }

      /* 4. build ?message= param and open ChatGPT */
      const message = encodeURIComponent(formattedMessage);
      const gptUrl = `https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai?message=${message}`;
      console.log('[ChatGPT] Opening URL:', gptUrl);

      // Open ChatGPT immediately after clipboard attempt
      setTimeout(() => {
        const newWindow = window.open(gptUrl, "_blank");
        console.log('[ChatGPT] Window opened:', newWindow);
        setActiveModal(null);
        setIsCopping(false);
      }, clipboardSuccess ? 800 : 100); // Faster if clipboard failed
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

  const handleManualCopy = async () => {
    if (!chatGPTMessage) return;
    
    try {
      await navigator.clipboard.writeText(chatGPTMessage);
      toast({
        title: "✅ Copied to clipboard!",
        description: "Now paste this in ChatGPT to load your report.",
      });
    } catch (error) {
      console.error('[ChatGPT] Manual copy failed:', error);
      toast({
        title: "Copy failed",
        description: "Please manually copy the text above.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChatGPTModal = async () => {
    // Show AI choice prompt first
    setActiveModal('ai-choice');
  };

  const handlePremiumFlow = async () => {
    try {
      // Generate the message immediately when modal opens
      const guestReportId = reportData.guest_report?.id;
      if (!guestReportId) {
        toast({
          title: "Error",
          description: "Report data not found.",
          variant: "destructive",
        });
        return;
      }

      // Fetch temp data to generate message
      const createResponse = await fetch(
        "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/create-temp-report-data",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_report_id: guestReportId }),
        }
      );
      
      if (!createResponse.ok) {
        throw new Error("Failed to create temp report data");
      }
      
      const createResult = await createResponse.json();
      const uuid = createResult.temp_data_id;
      const token = createResult.plain_token;
      
      const formattedMessage = `uuid: ${uuid}\ntoken: ${token}`;
      setChatGPTMessage(formattedMessage);
      
      setHasChosenAIPath(true);
      setActiveModal('chatgpt');
    } catch (error) {
      console.error('[ChatGPT] Failed to prepare message:', error);
      toast({
        title: "Error",
        description: "Failed to prepare ChatGPT data.",
        variant: "destructive",
      });
    }
  };

  const handleGenericFlow = async () => {
    try {
      // Prepare generic AI data (report content + astro JSON)
      let genericData = '';
      
      // Add report content if available
      if (reportData.report_content && reportData.report_content.trim().length > 20) {
        genericData += `ASTROLOGY REPORT:\n\n${reportData.report_content}\n\n`;
      }
      
      // Add astro data if available
      if (reportData.swiss_data) {
        genericData += `ASTROLOGICAL DATA:\n${JSON.stringify(reportData.swiss_data, null, 2)}\n\n`;
      }
      
      // Add instruction
      genericData += `INSTRUCTIONS: Please interpret this astrology report and provide insights about the person's personality, life themes, and potential opportunities.`;
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(genericData);
        setGenericCopySuccess(true);
        
        // Auto-close modal after 3 seconds so user can see the animation
        setTimeout(() => {
          setGenericCopySuccess(false);
          setActiveModal(null);
        }, 3000);
      } catch (clipboardError) {
        console.error('[Generic AI] Clipboard error:', clipboardError);
        
        // Fallback for mobile browsers
        try {
          const textArea = document.createElement('textarea');
          textArea.value = genericData;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          
          // Always remove the temporary element
          if (document.body.contains(textArea)) {
            document.body.removeChild(textArea);
          }
          
          if (successful) {
            setGenericCopySuccess(true);
            
            // Auto-close modal after 3 seconds so user can see the animation
            setTimeout(() => {
              setGenericCopySuccess(false);
              setActiveModal(null);
            }, 3000);
          } else {
            toast({
              title: "Data ready",
              description: "Your astrology data is ready to paste into any AI tool.",
            });
          }
        } catch (fallbackError) {
          console.error('[Generic AI] Fallback clipboard error:', fallbackError);
          toast({
            title: "Data ready",
            description: "Your astrology data is ready to paste into any AI tool.",
          });
        }
      }
      
      setHasChosenAIPath(true);
      // Don't close modal immediately - let the 3-second timeout handle it
    } catch (error) {
      console.error('[Generic AI] Failed to prepare data:', error);
      toast({
        title: "Error",
        description: "Failed to prepare AI data.",
        variant: "destructive",
      });
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
                              <h3 className="text-xl font-light text-gray-900">
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
            {/* Hide Copy and ChatGPT buttons on mobile - they'll be in the footer */}
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal('email')}
                className="text-gray-700 text-base font-medium hover:text-black hover:bg-gray-100 transition-colors active:scale-95 border-gray-200"
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Email
              </Button>
            )}
            
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
            
            {!isMobile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenChatGPTModal}
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
            )}
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

        {/* Mobile Footer - Only visible on mobile */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 safe-area-pb">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveModal('email')}
                className="flex-1 h-12 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-100 transition-colors border-gray-200 rounded-xl"
              >
                <Paperclip className="h-5 w-5 mr-2" />
                Email
              </Button>
              
              <Button
                variant="outline"
                onClick={handleOpenChatGPTModal}
                disabled={isCopping}
                className="flex-1 h-12 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-100 transition-colors border-gray-200 rounded-xl"
              >
                <img 
                  src="/lovable-uploads/a27cf867-e7a3-4d2f-af1e-16aaa70117e4.png" 
                  alt="ChatGPT" 
                  className="h-5 w-5 mr-2"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0734a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'/%3E%3C/svg%3E";
                  }}
                />
                {isCopping ? 'Opening...' : 'ChatGPT'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Email PDF Modal */}
      <Dialog open={activeModal === 'email'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-light text-gray-900">
              Email your PDF report
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
              We'll email the PDF to: <span className="font-medium text-gray-900">{reportData.guest_report?.email}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setActiveModal(null)}
              className="h-11 text-base text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  setIsSendingEmail(true);
                  const guestReportId = reportData.guest_report?.id;
                  if (!guestReportId) {
                    throw new Error('Report not found');
                  }

                  const { data: statusRow, error: statusErr } = await supabase
                    .from('guest_reports')
                    .select('email_sent, email_sent_at')
                    .eq('id', guestReportId)
                    .maybeSingle();

                  if (statusErr) throw new Error('Failed to check email status');

                  if (statusRow?.email_sent) {
                    const sentAt = statusRow.email_sent_at ? new Date(statusRow.email_sent_at).toLocaleString() : 'earlier';
                    toast({
                      title: 'Email already sent',
                      description: `We sent your report on ${sentAt}. Please check all inboxes (and spam).`,
                    });
                    setActiveModal(null);
                    return;
                  }

                  const { data, error } = await supabase.functions.invoke('process-guest-report-pdf', {
                    body: { guest_report_id: guestReportId }
                  });

                  if (error) throw new Error(error.message);

                  toast({
                    title: 'Email sent!',
                    description: 'Your PDF report is on its way. Please check your inbox.',
                  });
                  setActiveModal(null);
                } catch (e: any) {
                  toast({
                    title: 'Email failed',
                    description: e?.message || 'Please try again.',
                    variant: 'destructive'
                  });
                } finally {
                  setIsSendingEmail(false);
                }
              }}
              disabled={isSendingEmail}
              className="h-11 text-base"
            >
              {isSendingEmail ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Choice Modal */}
      <Dialog open={activeModal === 'ai-choice'} onOpenChange={(open) => {
        if (!open) {
          setGenericCopySuccess(false);
        }
        setActiveModal(null);
      }}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-light text-gray-900">
              Do you use ChatGPT Premium?
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
              We've prepped your astrology data for AI-based interpretation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handlePremiumFlow}
              className="h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              Yes, open in ChatGPT
            </Button>
            <Button
              onClick={handleGenericFlow}
              disabled={genericCopySuccess}
              className={`h-12 text-lg font-normal rounded-full transition-all duration-500 ease-out active:scale-[0.98] ${
                genericCopySuccess 
                  ? 'bg-green-600 text-white cursor-default' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {genericCopySuccess ? 'Done, enjoy!' : 'No, I\'ll use another AI'}
            </Button>
            <Button
              onClick={() => {
                setGenericCopySuccess(false);
                setActiveModal(null);
              }}
              variant="ghost"
              className="h-10 text-sm text-gray-500 font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ChatGPT Confirmation Modal */}
      <Dialog open={activeModal === 'chatgpt'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-light text-gray-900">
              Analyze with ChatGPT
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 leading-relaxed mt-2">
              We'll copy your access token to clipboard and open ChatGPT. Simply paste the token in the chat to load your report.
            </DialogDescription>
          </DialogHeader>
          
          {chatGPTMessage && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Your access token:</p>
              <div className="text-xs font-mono text-gray-800 break-all bg-white p-2 rounded border">
                {chatGPTMessage}
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleChatGPTCopyAndGo}
              disabled={isCopping}
              className="h-12 text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {isCopping ? 'Opening...' : 'Go'}
            </Button>
            <Button
              onClick={handleManualCopy}
              disabled={isCopping}
              className="h-12 text-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {isCopping ? 'Copying...' : 'Copy Token'}
            </Button>
            <Button
              onClick={() => setActiveModal(null)}
              disabled={isCopping}
              variant="outline"
              className="h-12 text-lg text-gray-900 font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98] border-gray-200"
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
            <DialogTitle className="text-2xl font-light text-gray-900">
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
              className="h-12 text-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98]"
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
              className="h-12 text-lg text-gray-900 font-normal rounded-full transition-all duration-200 ease-out active:scale-[0.98] border-gray-200 disabled:opacity-50"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
  
  // Add timing log after component renders
  useEffect(() => {
    const mountEndTime = performance.now();
    const mountDuration = mountEndTime - mountStartTime;
    console.log(`[ReportViewer] ✅ ReportViewer mount completed in ${mountDuration.toFixed(2)}ms`);
  }, []);
};
