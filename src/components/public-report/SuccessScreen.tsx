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
import { getGuestReportId } from '@/utils/urlHelpers';
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
  onViewReport?: (content: string, pdf?: string | null, swissData?: any, hasReport?: boolean, swissBoolean?: boolean) => void;
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

  const reportType = report?.report_type as ReportType | undefined;
  const isAstroDataOnly = isAstroOnlyType(reportType);

  const isReady =
    report?.swiss_boolean === true ||
    (report?.has_report && !!(report?.translator_log_id || report?.report_log_id));

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  const handleViewReport = useCallback(async () => {
    if (!onViewReport) return;

    try {
      console.log('🔄 SuccessScreen - Fetching complete report data');
      
      const reportData = await fetchCompleteReport(guestReportId);
      
      console.log('✅ Report data received:', {
        content_type: reportData.metadata.content_type,
        has_report_content: !!reportData.report_content,
        has_swiss_data: !!reportData.swiss_data
      });

      // Extract content based on type
      let reportContent = '';
      if (reportData.metadata.is_ai_report && reportData.report_content) {
        reportContent = reportData.report_content;
      } else if (reportData.metadata.is_astro_report && reportData.swiss_data?.report?.content) {
        reportContent = reportData.swiss_data.report.content;
      } else if (reportData.metadata.is_astro_report && typeof reportData.swiss_data?.report === 'string') {
        reportContent = reportData.swiss_data.report;
      }

      onViewReport(
        reportContent || 'Report content could not be loaded',
        null, // PDF data
        reportData.swiss_data,
        reportData.metadata.is_ai_report,
        reportData.metadata.is_astro_report
      );
      
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      onViewReport(
        'Failed to load report content. Please try again.',
        null,
        null,
        false,
        false
      );
    }
  }, [guestReportId, onViewReport, fetchCompleteReport]);

  useEffect(() => {
    const scrollToProcessing = () => {
      const element = document.querySelector('[data-success-screen]');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scrollToProcessing();

    const reportIdToUse = guestReportId || getGuestReportId();
    if (reportIdToUse) {
      fetchReport(reportIdToUse);
      
      // Setup realtime listener to auto-trigger modal
      const cleanup = setupRealtimeListener(reportIdToUse, () => {
        console.log('🔥 Realtime detected report ready - auto-triggering modal');
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
            console.log('📝 Logged missing ID error with case number:', data?.case_number);
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
  }, [guestReportId, fetchReport, setupRealtimeListener, handleViewReport, modalTriggered, email]);

  useEffect(() => {
    if (!isReady && !error && isVideoReady) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => {
          if (c <= 1) {
            const reportIdToUse = guestReportId || getGuestReportId();
            if (reportIdToUse) triggerErrorHandling(reportIdToUse);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(countdownRef.current as NodeJS.Timeout);
  }, [countdown, isReady, error, isVideoReady, guestReportId, triggerErrorHandling]);


  const status = (() => {
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
    return { title: 'Processing', desc: 'Please wait', icon: Clock };
  })();

  const StatusIcon = status.icon;

  const handleTryAgain = () => navigate('/');
  const handleContactSupport = () => {
    const errorMessage = `Hi, I'm experiencing an issue with my report generation.\n\nReport Details:\n- Name: ${name}\n- Email: ${email}\n- Report ID: ${guestReportId || 'N/A'}\n- Case Number: ${caseNumber || 'N/A'}\n- Time: ${new Date().toLocaleString()}\n`;
    localStorage.setItem('contactFormPrefill', JSON.stringify({ name, email, subject: 'Report Issue', message: errorMessage }));
    navigate('/contact');
  };

  const PersonalNote = (
    <div className="bg-muted/50 rounded-lg p-4 text-sm">
      Hi {firstName}!{' '}
      {isReady
        ? "Your report is ready to view. We've also emailed it to you."
        : "We're working on your report and will notify you when it's ready."}
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
          <h3 className="text-2xl font-light text-gray-900 mb-1 tracking-tight italic">
            Report Processing Issue
          </h3>
          <p className="text-gray-600 font-light">We're working to resolve this quickly</p>
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
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <p className="text-sm font-medium text-red-800">Reference Number</p>
          </div>
          <p className="text-lg font-mono text-red-900 mb-2">{caseNumber}</p>
          <p className="text-xs text-red-600">Save this reference number for faster assistance.</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button onClick={handleTryAgain} className="bg-gray-900 text-white font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition-all">
          Try Again
        </Button>
        <Button variant="outline" onClick={handleContactSupport} className="border-gray-900 text-gray-900 font-light px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-all">
          Contact Support
        </Button>
      </div>
    </div>
  );

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
                <Button onClick={handleViewReport} className="bg-gray-900 hover:bg-gray-800 text-white font-light">
                  View Report
                </Button>
              </>
            )}
            {error && (
              <div className="text-center py-8">
                <div className="text-gray-600 font-light mb-4">
                  We've detected an issue with your report. Our team has been notified.
                </div>
                <Button onClick={handleTryAgain} className="bg-gray-900 text-white font-light">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
