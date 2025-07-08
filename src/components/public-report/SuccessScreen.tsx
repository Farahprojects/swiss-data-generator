import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
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
  guestReportId?: string;
  isAstroDataReport?: boolean;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  name,
  email,
  onViewReport,
  guestReportId,
  isAstroDataReport = false,
}) => {
  // ---------------------------------------------------------------------------
  // Hooks & State
  // ---------------------------------------------------------------------------
  const { report, isLoading, error, caseNumber, fetchReport, triggerErrorHandling, fetchReportContent } = useGuestReportStatus();
  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useViewportHeight();

  const [countdown, setCountdown] = useState(30);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const redirectRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Video ready handler
  // ---------------------------------------------------------------------------
  const handleVideoReady = useCallback(() => {
    logToAdmin('SuccessScreen', 'video_ready', 'Video is ready, starting report checks', {
      name: name,
      email: email,
      guestReportId: guestReportId
    });
    setIsVideoReady(true);
  }, [name, email, guestReportId]);

  // ---------------------------------------------------------------------------
  // Initial fetch and periodic checks
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const scrollToProcessing = () => {
      const element = document.querySelector('[data-success-screen]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    scrollToProcessing();
    
    const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
    if (reportIdToUse && isVideoReady) {
      // Initial fetch
      fetchReport(reportIdToUse);
      
      // Check every 10 seconds until report is ready
      checkIntervalRef.current = setInterval(() => {
        if (report?.has_report) {
          clearInterval(checkIntervalRef.current!);
          return;
        }
        fetchReport(reportIdToUse);
      }, 10000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [guestReportId, isVideoReady, fetchReport, report?.has_report]);

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
    if (report.has_report && (report.translator_log_id || report.report_log_id)) {
      return { step: 3, title: 'Report Ready!', desc: 'Your personalized report is complete', progress: 100, icon: CheckCircle };
    }
    return { step: 1, title: 'Processing', desc: 'Please wait while we prepare your report', progress: 30, icon: Clock };
  }, [report]);

  const status = getStatus();
  const StatusIcon = status.icon;
  const isReady = report?.has_report && !!(report?.translator_log_id || report?.report_log_id);

  // ---------------------------------------------------------------------------
  // Countdown logic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isReady && !error && isVideoReady) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => {
          if (c <= 1) {
            const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
            if (reportIdToUse) {
              triggerErrorHandling(reportIdToUse);
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => countdownRef.current && clearTimeout(countdownRef.current);
  }, [countdown, isReady, error, isVideoReady, guestReportId, triggerErrorHandling]);

  // ---------------------------------------------------------------------------
  // Handle view report with actual content
  // ---------------------------------------------------------------------------
  const handleViewReport = useCallback(async () => {
    const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
    if (!reportIdToUse || !onViewReport) return;

    const reportContent = await fetchReportContent(reportIdToUse);
    if (reportContent) {
      onViewReport(reportContent, null);
    } else {
      console.warn('Could not fetch report content');
      onViewReport('Report content could not be loaded', null);
    }
  }, [guestReportId, fetchReportContent, onViewReport]);

  // ---------------------------------------------------------------------------
  // Auto redirect when ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isReady && onViewReport && !isAstroDataReport) {
      redirectRef.current = setTimeout(handleViewReport, 2000);
    }
    return () => redirectRef.current && clearTimeout(redirectRef.current);
  }, [isReady, onViewReport, isAstroDataReport, handleViewReport]);

  // ---------------------------------------------------------------------------
  // Error handling functions
  // ---------------------------------------------------------------------------
  const handleTryAgain = () => {
    navigate('/');
  };

  const handleContactSupport = async () => {
    const errorMessage = `Hi, I'm experiencing an issue with my report generation. 
    
Report Details:
- Name: ${name}
- Email: ${email}
- Report ID: ${guestReportId || 'N/A'}
- Case Number: ${caseNumber || 'N/A'}
- Error occurred during: Report processing
- Time: ${new Date().toLocaleString()}

The report was not generated within the expected timeframe. Please help me resolve this issue.`;

    const prefillData = {
      name: name,
      email: email,
      subject: 'General Inquiry',
      message: errorMessage
    };
    
    localStorage.setItem('contactFormPrefill', JSON.stringify(prefillData));
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
            {ProcessingStatus}

            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>

            {!isReady && !error && (
              <>
                <VideoLoader onVideoReady={handleVideoReady} />
                {PersonalNote}
              </>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="text-gray-600 font-light mb-4">
                  We've detected an issue with your report generation. Our team has been notified.
                </div>
                {PersonalNote}
              </div>
            )}

            {isReady && (
              <>
                {PersonalNote}
                {isAstroDataReport ? (
                  isMobile ? (
                    <div className="flex gap-8 justify-center">
                       <button 
                         onClick={handleViewReport}
                         className="flex items-center text-gray-700 font-light text-lg hover:text-gray-900 transition-colors duration-300"
                       >
                         View
                       </button>
                      <button 
                        onClick={async () => {
                          const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
                          if (reportIdToUse) {
                            const reportContent = await fetchReportContent(reportIdToUse);
                            if (reportContent) {
                              await navigator.clipboard.writeText(reportContent);
                            }
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
                          const reportIdToUse = guestReportId || localStorage.getItem('currentGuestReportId');
                          if (reportIdToUse) {
                            const reportContent = await fetchReportContent(reportIdToUse);
                            if (reportContent) {
                              await navigator.clipboard.writeText(reportContent);
                              setTimeout(() => {
                                const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&prompt=${encodeURIComponent(`Please analyze this astrological report and provide additional insights or answer any questions I might have:\n\n${reportContent}`)}`;
                                window.open(chatGPTUrl, '_blank');
                              }, 1000);
                            }
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
                       onClick={handleViewReport}
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
                    onClick={handleViewReport}
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