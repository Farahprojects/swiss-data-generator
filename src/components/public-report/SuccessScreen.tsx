import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { logToAdmin } from '@/utils/adminLogger';
import { useNavigate } from 'react-router-dom';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VIDEO_SRC =
  'https://auth.theraiastro.com/storage/v1/object/public/therai-assets/loading-video.mp4';

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------
const VideoLoader: React.FC<{ onVideoReady?: () => void }> = ({ onVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false); // Start unmuted for audio

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    // On some browsers, volume resets when muted flips – make sure it's audible
    if (!vid.muted) vid.volume = 1;
    setIsMuted(!isMuted);
  };

  const handleVideoReady = () => {
    onVideoReady?.();
  };

  return (
    <div className="relative w-full h-0 pt-[56.25%] overflow-hidden rounded-xl shadow-lg">
      
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        controls={false}
        onCanPlay={handleVideoReady}
        onLoadedData={handleVideoReady}
      />
      
      {/* Mute / Un‑mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 bg-black/50 text-white rounded-full p-2 backdrop-blur-sm hover:bg-black/70 transition"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (content: string, pdf?: string | null) => void;
  autoStartPolling?: boolean;
  guestReportId?: string;
  isAstroDataReport?: boolean;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  name,
  email,
  onViewReport,
  autoStartPolling = true,
  guestReportId,
  isAstroDataReport = false,
}) => {
  // ---------------------------------------------------------------------------
  // Hooks & State
  // ---------------------------------------------------------------------------
  const { report, isPolling, error, caseNumber, startPolling, stopPolling, triggerErrorHandling } = useGuestReportStatus();
  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useViewportHeight();

  const [countdown, setCountdown] = useState(24);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const redirectRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Video ready handler
  // ---------------------------------------------------------------------------
  const handleVideoReady = useCallback(() => {
    logToAdmin('SuccessScreen', 'video_ready', 'Video is ready, setting isVideoReady to true', {
      name: name,
      email: email,
      guestReportId: guestReportId
    });
    setIsVideoReady(true);
  }, [name, email, guestReportId]);

  // ---------------------------------------------------------------------------
  // Auto-scroll and polling lifecycle - wait for video to be ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Auto-scroll to the processing section when component mounts
    const scrollToProcessing = () => {
      const element = document.querySelector('[data-success-screen]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    scrollToProcessing();
    
    const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
    if (autoStartPolling && reportIdToUse && !isPolling && isVideoReady) {
      logToAdmin('SuccessScreen', 'polling_start', 'Starting polling after video is ready', {
        reportIdToUse: reportIdToUse,
        isPolling: isPolling,
        isVideoReady: isVideoReady
      });
      setTimeout(() => startPolling(reportIdToUse), 2000); // 2 second delay after video ready
    }
    return () => stopPolling();
  }, [autoStartPolling, guestReportId, isPolling, isVideoReady, startPolling, stopPolling]);

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------
  const getStatus = useCallback(() => {
    if (!report) {
      return { step: 1, title: 'Processing Your Request', desc: "We're setting up your personalized report", progress: 10, icon: Clock };
    }
    if (report.payment_status === 'pending') {
      return { step: 1, title: 'Payment Processing', desc: 'Confirming your payment details', progress: 25, icon: Clock };
    }
    if (report.payment_status === 'paid' && !report.has_report) {
      return { step: 2, title: 'Generating Your Report', desc: 'Our AI is crafting your personalized insights', progress: 60, icon: Clock };
    }
    if (report.has_report && report.report_content) {
      return { step: 3, title: 'Report Ready!', desc: 'Your personalized report is complete', progress: 100, icon: CheckCircle };
    }
    return { step: 1, title: 'Processing', desc: 'Please wait while we prepare your report', progress: 30, icon: Clock };
  }, [report]);

  const status = getStatus();
  const StatusIcon = status.icon;
  const isReady = report?.has_report && !!report?.report_content;

  // ---------------------------------------------------------------------------
  // Countdown logic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isReady && !error) setCountdown(24);
  }, [status.step, isReady, error]);

  useEffect(() => {
    if (!isReady && countdown > 0 && !error) {
      countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1_000);
    } else if (countdown === 0 && !error) {
      // Debug logging for when countdown hits 0
      logToAdmin('SuccessScreen', 'countdown_zero_debug', 'Countdown hit 0s - Debug Info', {
        isReady,
        countdown,
        caseNumber,
        email,
        hasReport: report?.has_report,
        reportContent: !!report?.report_content
      });
      
      const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
      if (!isReady && !caseNumber && reportIdToUse) {
        logToAdmin('SuccessScreen', 'error_handling_triggered', 'All conditions met - triggering error handling', {
          reportIdToUse: reportIdToUse
        });
        triggerErrorHandling(reportIdToUse);
      } else {
        logToAdmin('SuccessScreen', 'error_handling_conditions_not_met', 'Conditions not met for error handling', {
          isReady: isReady,
          hasCaseNumber: !!caseNumber,
          hasReportId: !!reportIdToUse
        });
      }
    }
    return () => countdownRef.current && clearTimeout(countdownRef.current);
  }, [countdown, isReady, caseNumber, email, triggerErrorHandling, error]);

  // ---------------------------------------------------------------------------
  // Auto redirect when ready (skip auto-redirect for astro data reports)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isReady && onViewReport && !isAstroDataReport) {
      redirectRef.current = setTimeout(
        () => onViewReport(report!.report_content!, report!.report_pdf_data),
        2_000,
      );
    }
    return () => redirectRef.current && clearTimeout(redirectRef.current);
  }, [isReady, onViewReport, report, isAstroDataReport]);

  // ---------------------------------------------------------------------------
  // Error handling functions
  // ---------------------------------------------------------------------------
  const handleTryAgain = () => {
    // Navigate to home page
    navigate('/');
  };

  const handleContactSupport = async () => {
    // Wait a moment for error logging to complete if case number isn't available yet
    let finalCaseNumber = caseNumber;
    if (!finalCaseNumber) {
      // Wait up to 2 seconds for case number to be generated
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (caseNumber) {
          finalCaseNumber = caseNumber;
          break;
        }
      }
    }

    // Create error message for contact form
    const errorMessage = `Hi, I'm experiencing an issue with my report generation. 
    
Report Details:
- Name: ${name}
- Email: ${email}
- Report ID: ${guestReportId || 'N/A'}
- Case Number: ${finalCaseNumber || 'N/A'}
- Error occurred during: Report processing
- Time: ${new Date().toLocaleString()}

The report was not generated within the expected timeframe. Please help me resolve this issue.`;

    // Store the pre-filled data in localStorage for the contact page to pick up
    const prefillData = {
      name: name,
      email: email,
      subject: 'General Inquiry',
      message: errorMessage
    };
    
    localStorage.setItem('contactFormPrefill', JSON.stringify(prefillData));
    console.log('📝 Stored contact form prefill data:', prefillData);

    // Navigate to contact page
    navigate('/contact');
  };

  // ---------------------------------------------------------------------------
  // Shared blocks
  // ---------------------------------------------------------------------------
  const ProcessingStatus = (
    <div className="flex items-center justify-center gap-4 py-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <StatusIcon className="h-6 w-6 text-gray-600" />
      </div>
      {!isReady && !error && (
        <>
          <div className="text-3xl font-light text-gray-900">{countdown}s</div>
          <div className="text-gray-600 font-light">Report generating...</div>
        </>
      )}
      {isReady && (
        <div className="text-gray-600 font-light">Ready to view</div>
      )}
      {error && (
        <div className="text-gray-600 font-light">Processing issue detected</div>
      )}
    </div>
  );

  const PersonalNote = (
    <div className="bg-muted/50 rounded-lg p-4 text-sm">
      Hi {firstName}! {isReady ? 'Your report is ready to view. We\'ve also emailed it to you.' : "We're working on your report and will notify you when it's ready."}
      <br />
      <span className="font-medium">{email}</span>
    </div>
  );

  const ErrorBlock = error && (
    <div className="max-w-xl mx-auto bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl p-8 shadow-md space-y-6 mt-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">
            <span className='italic'>Report</span> Processing Issue
          </h3>
          <p className="text-gray-600 font-light">
            We're working to resolve this quickly
          </p>
        </div>
      </div>
      <div className="bg-white/80 rounded-xl p-6">
        <p className="text-base text-gray-700 font-light leading-relaxed">
          We're experiencing a delay with your report generation. Our team has been automatically notified and is working to resolve this issue.
        </p>
      </div>
      {caseNumber && (
        <div className="bg-white rounded-xl border border-red-200 p-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-sm font-medium text-red-800">
              Reference Number
            </p>
          </div>
          <p className="text-lg font-mono text-red-900 mb-2">
            {caseNumber}
          </p>
          <p className="text-xs text-red-600">
            Please save this reference number for your records. Our support team can use it to help you faster.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button 
          onClick={handleTryAgain} 
          className="bg-gray-900 text-white font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition-all"
        >
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={handleContactSupport}
          className="border-gray-900 text-gray-900 font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-all"
        >
          Contact Support
        </Button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  return (
    <div
      className={
        isMobile
          ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto'
          : 'w-full py-10 px-4 flex justify-center'
      }
      data-success-screen
    >
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {/* Processing Status - Consolidated */}
            {ProcessingStatus}

            {/* Title / desc */}
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>

            {/* Content while generating */}
            {!isReady && !error && (
              <>
                <VideoLoader onVideoReady={handleVideoReady} />
                {PersonalNote}
              </>
            )}

            {/* Error state - hide video and show error message */}
            {error && (
              <div className="text-center py-8">
                <div className="text-gray-600 font-light mb-4">
                  We've detected an issue with your report generation. Our team has been notified.
                </div>
                {PersonalNote}
              </div>
            )}

            {/* Ready state */}
            {isReady && (
              <>
                {PersonalNote}
                {isAstroDataReport ? (
                  isMobile ? (
                    <div className="flex gap-8 justify-center">
                      <button 
                        onClick={() => onViewReport?.(report!.report_content!, report!.report_pdf_data)}
                        className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
                      >
                        View
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = report!.report_content!;
                            const cleanText = tempDiv.textContent || tempDiv.innerText || '';
                            await navigator.clipboard.writeText(cleanText);
                          } catch (error) {
                            console.error('Copy failed:', error);
                          }
                        }}
                        className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = report!.report_content!;
                            const cleanText = tempDiv.textContent || tempDiv.innerText || '';
                            await navigator.clipboard.writeText(cleanText);
                            setTimeout(() => {
                              const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report and provide additional insights or answer any questions I might have:\n\n${cleanText}`)}`;
                              window.open(chatGPTUrl, '_blank');
                            }, 1000);
                          } catch (error) {
                            console.error('ChatGPT action failed:', error);
                          }
                        }}
                        className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
                      >
                        <img 
                          src="/placeholder.svg" 
                          alt="ChatGPT" 
                          className="h-5 w-5"
                        />
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => onViewReport?.(report!.report_content!, report!.report_pdf_data)}
                      className="group flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-light transition-all duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>View Data</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )
                ) : (
                  <Button 
                    onClick={() => onViewReport?.(report!.report_content!, report!.report_pdf_data)}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-light"
                  >
                    View now
                  </Button>
                )}
              </>
            )}

            {ErrorBlock}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
