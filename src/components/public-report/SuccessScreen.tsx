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
import { getGuestToken, clearAllSessionData } from '@/utils/urlHelpers';
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
  const [fetchedReportData, setFetchedReportData] = useState<any>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Clean token retrieval
  const currentGuestReportId = useMemo(() => {
    return guestReportId || getGuestToken();
  }, [guestReportId]);

  // Protect against null tokens - redirect if no token found
  if (!currentGuestReportId) {
    return (
      <div className="w-full py-10 px-4 flex justify-center">
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Session expired. Please start a new report.</p>
            <Button 
              onClick={() => navigate('/report')} 
              className="mt-4 bg-gray-900 text-white font-light hover:bg-gray-800"
            >
              Start New Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportType = report?.report_type as ReportType | undefined;
  const isAstroDataOnly = isAstroOnlyType(reportType);

  const hasSwissError = report?.has_swiss_error === true;
  
  const isReady = !hasSwissError && (
    fetchedReportData?.metadata?.content_type === 'both' || 
    fetchedReportData?.metadata?.content_type === 'astro' || 
    fetchedReportData?.metadata?.content_type === 'ai' ||
    // Fallback to original logic if edge function data not available
    (isAstroDataOnly && report?.swiss_boolean === true) ||
    (!isAstroDataOnly && !!report?.has_report && !!report?.swiss_boolean)
  );

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  const handleViewReport = useCallback(async () => {
    if (!onViewReport || !currentGuestReportId) return;

    try {
      console.log('🔍 SuccessScreen - Fetching report for:', currentGuestReportId);
      const data = await fetchCompleteReport(currentGuestReportId);

      if (!data) throw new Error('No data returned from edge function');

      const { report_content, swiss_data, guest_report, metadata } = data;
      const reportType = guest_report.report_type;
      const hasSwiss = !!swiss_data;
      const hasAi = !!report_content;
      const contentType = metadata?.content_type;

      console.log('✅ Report Data:', { contentType, hasSwiss, hasAi });

      // Store fetched data for readiness check
      setFetchedReportData(data);

      const isAstro = contentType === 'astro' || contentType === 'both';
      const isAi = contentType === 'ai' || contentType === 'both';

      // If it's an AI report, we MUST have both content and Swiss data
      if (isAi && (!hasSwiss || !hasAi)) {
        console.warn('🛑 AI report missing required content or Swiss data');
        return;
      }

      // If it's Astro only, we MUST have Swiss data
      if (isAstro && !hasSwiss) {
        console.warn('🛑 Astro report missing Swiss data');
        return;
      }

      onViewReport(
        report_content || 'No content available',
        null,
        swiss_data,
        isAi,
        isAstro,
        reportType
      );

    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      onViewReport('Failed to load report content.', null, null, false, false);
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
      const cleanup = setupRealtimeListener(currentGuestReportId, async () => {
        if (!modalTriggered) {
          setModalTriggered(true);
          // Try to fetch complete report data first
          try {
            const data = await fetchCompleteReport(currentGuestReportId);
            if (data) {
              setFetchedReportData(data);
            }
          } catch (error) {
            console.error('Error fetching complete report in listener:', error);
          }
          handleViewReport();
        }
      });
      
      return cleanup;
    }
  }, [currentGuestReportId, fetchReport, setupRealtimeListener, handleViewReport, modalTriggered, email]);

  // Countdown logic - stop if Swiss error detected
  useEffect(() => {
    if (!isReady && isVideoReady && !hasSwissError) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
    }
    return () => clearTimeout(countdownRef.current as NodeJS.Timeout);
  }, [countdown, isReady, isVideoReady, hasSwissError]);


  const status = (() => {
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
    return { title: '', desc: 'Please wait', icon: Clock };
  })();

  const StatusIcon = status.icon;

  const handleTryAgain = async () => {
    if (currentGuestReportId) {
      setError(null);
      setCaseNumber(null);
      await fetchReport(currentGuestReportId);
    } else {
      navigate('/report');
    }
  };
  
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
              {!isReady && (
                <>
                  <div className="text-3xl font-light text-gray-900">{countdown}s</div>
                  <div className="text-gray-600 font-light">Report generating...</div>
                </>
              )}
              {isReady && <div className="text-gray-600 font-light">Ready to view</div>}
            </div>
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>
            {!isReady && !isAstroDataOnly && (
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
            {/* Swiss Error UI */}
            {hasSwissError && error && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <span className="font-medium text-red-800">Astrological Data Error</span>
                  </div>
                  <p className="text-red-700 mb-3">{error}</p>
                  {caseNumber && (
                    <p className="text-red-600 text-xs">
                      Reference: <span className="font-mono">{caseNumber}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleTryAgain} className="bg-gray-900 hover:bg-gray-800 text-white font-light">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleContactSupport} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Contact Support
                  </Button>
                  <Button variant="outline" onClick={handleBackToForm} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Start New Report
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
