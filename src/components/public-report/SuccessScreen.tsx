import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { CheckCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { logToAdmin } from '@/utils/adminLogger';
import { useNavigate } from 'react-router-dom';
import { getGuestReportId, clearAllSessionData } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

type ReportType = 'essence' | 'sync';
const VIDEO_SRC = 'https://auth.theraiastro.com/storage/v1/object/public/therai-assets/loading-video.mp4';

const isAstroOnlyType = (type?: ReportType): boolean => type === 'essence' || type === 'sync';

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
  const handleVideoReady = () => onVideoReady?.();
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

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (content: string, pdf?: string | null, swissData?: any, hasReport?: boolean, swissBoolean?: boolean, reportType?: string) => void;
  guestReportId?: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ name, email, onViewReport, guestReportId }) => {
  const {
    report,
    error,
    caseNumber,
    fetchReport,
    triggerErrorHandling,
    fetchCompleteReport,
    fetchBothReportData,
    setupRealtimeListener,
    setError,
    setCaseNumber,
  } = useGuestReportStatus();

  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useViewportHeight();

  const [countdown, setCountdown] = useState(24);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [modalTriggered, setModalTriggered] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Preload guest report ID using useMemo
  const currentGuestReportId = useMemo(() => {
    return guestReportId || getGuestReportId();
  }, [guestReportId]);

  const reportType = report?.report_type as ReportType | undefined;
  const isAstroDataOnly = isAstroOnlyType(reportType);

  const isReady =
    // Astro-only (essence/sync) types need just Swiss
    (isAstroDataOnly && report?.swiss_boolean === true) ||
    // AI reports must have both AI content + Swiss data
    (!isAstroDataOnly && !!report?.has_report && !!report?.swiss_boolean);

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  const handleViewReport = useCallback(async () => {
    if (!onViewReport || !currentGuestReportId) return;

    try {
      console.log('🔍 SuccessScreen - Using get-guest-report edge function for:', currentGuestReportId);
      
      // Use the get-guest-report edge function which has proper data extraction logic
      const data = await fetchCompleteReport(currentGuestReportId);
      
      console.log('🔍 SuccessScreen - Edge function response:', {
        hasReportContent: !!data?.report_content,
        hasSwissData: !!data?.swiss_data,
        contentType: data?.metadata?.content_type,
        isAstroReport: data?.metadata?.is_astro_report,
        isAiReport: data?.metadata?.is_ai_report
      });

      if (!data) {
        throw new Error('No data returned from edge function');
      }

      // Use the structured data from the edge function
      const reportContent = data.report_content || 'Report content could not be loaded';
      const swissData = data.swiss_data;
      const hasAiReport = data.metadata?.is_ai_report || false;
      const hasAstroData = data.metadata?.is_astro_report || false;

      // Guard: Don't proceed unless everything is ready
      if ((hasAiReport && (!reportContent || !swissData)) || (!hasAiReport && !swissData)) {
        console.warn("🛑 Report not ready — skipping modal load", {
          hasAiReport,
          hasReportContent: !!reportContent,
          hasSwissData: !!swissData
        });
        return;
      }

      console.log('🔍 SuccessScreen - Final data being passed to onViewReport:', {
        reportContent: reportContent ? 'HAS_CONTENT' : 'NO_CONTENT',
        swissData: swissData ? 'HAS_SWISS_DATA' : 'NO_SWISS_DATA',
        hasAiReport,
        hasAstroData
      });

      onViewReport(
        reportContent,
        null, // PDF data
        swissData, // Swiss data from edge function
        hasAiReport,
        hasAstroData,
        data.metadata?.report_type || report?.report_type // Pass the report type
      );
      
    } catch (error) {
      console.error('❌ Error fetching report data via edge function:', error);
      onViewReport(
        'Failed to load report content. Please try again.',
        null,
        null,
        false,
        false
      );
    }
  }, [currentGuestReportId, onViewReport, fetchCompleteReport]);

  useEffect(() => {
    const scrollToProcessing = () => {
      const element = document.querySelector('[data-success-screen]');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scrollToProcessing();

    if (currentGuestReportId) {
      fetchReport(currentGuestReportId);
      
      // Setup realtime listener to auto-trigger modal
      const cleanup = setupRealtimeListener(currentGuestReportId, () => {
        if (!modalTriggered) {
          setModalTriggered(true);
          handleViewReport();
        }
      });
      
      return cleanup;
    } else {
      // Handle missing ID scenario immediately
      console.warn('🚨 No guest report ID found - triggering missing ID error handling');
      const handleMissingId = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('log-user-error', {
            body: {
              guestReportId: null,
              errorType: 'missing_report_id',
              errorMessage: 'No guest report ID detected in URL or localStorage',
              email: email || 'unknown'
            }
          });

          if (error) {
            console.error('Failed to log missing ID error:', error);
          } else {
            setCaseNumber(data?.case_number || 'MISSING-' + Date.now());
          }
        } catch (err) {
          console.error('❌ Error logging missing ID:', err);
          setCaseNumber('MISSING-' + Date.now());
        }
        
        // Clear any stale state and set error
        localStorage.removeItem('currentGuestReportId');
        window.history.replaceState({}, '', window.location.pathname);
        setError('No report ID detected. Please restart the process.');
      };
      
      handleMissingId();
    }
  }, [currentGuestReportId, fetchReport, setupRealtimeListener, handleViewReport, modalTriggered, email]);

  useEffect(() => {
    if (!isReady && !error && isVideoReady) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (currentGuestReportId) triggerErrorHandling(currentGuestReportId);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(countdownRef.current as NodeJS.Timeout);
  }, [countdown, isReady, error, isVideoReady, currentGuestReportId, triggerErrorHandling]);


  const status = (() => {
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
    return { title: 'Processing', desc: 'Please wait', icon: Clock };
  })();

  const StatusIcon = status.icon;

  const handleTryAgain = () => navigate('/report');
  
  const handleBackToForm = () => {
    clearAllSessionData();
    navigate('/report');
  };
  
  const handleContactSupport = () => {
    const errorMessage = `Hi, I'm experiencing an issue with my report generation.\n\nReport Details:\n- Name: ${name}\n- Email: ${email}\n- Report ID: ${currentGuestReportId || 'N/A'}\n- Case Number: ${caseNumber || 'N/A'}\n- Time: ${new Date().toLocaleString()}\n`;
    localStorage.setItem('contactFormPrefill', JSON.stringify({ name, email, subject: 'Report Issue', message: errorMessage }));
    navigate('/contact');
  };

  const handleHome = () => {
    clearAllSessionData();
    navigate('/report');
  };

  return (
    <div data-success-screen className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
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
              {isReady && <div className="text-gray-600 font-light">Ready to view</div>}
              {error && <div className="text-gray-600 font-light">Processing issue detected</div>}
            </div>
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>
            {!isReady && !error && !isAstroDataOnly && (
              <>
                <VideoLoader onVideoReady={handleVideoReady} />
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! We're working on your report.<br />
                  <span className="font-medium">{email}</span>
                </div>
              </>
            )}
            {isReady && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is ready. <br />
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleViewReport} className="bg-gray-900 hover:bg-gray-800 text-white font-light">
                    View Report
                  </Button>
                  <Button variant="outline" onClick={handleBackToForm} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Home
                  </Button>
                </div>
              </>
            )}
            {error && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="text-gray-700 font-light mb-2">
                    We're experiencing a delay with your report generation. Our team has been automatically notified and is working to resolve this issue.
                  </p>
                  {caseNumber && (
                    <div className="mt-3 p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <p className="text-sm font-medium text-gray-800">Reference Number</p>
                      </div>
                      <p className="text-lg font-mono text-gray-900">{caseNumber}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleTryAgain} className="bg-gray-900 text-white font-light hover:bg-gray-800">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleHome} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Home
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
