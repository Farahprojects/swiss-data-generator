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

  const currentGuestReportId = useMemo(() => {
    return guestReportId || getGuestReportId();
  }, [guestReportId]);

  const handleViewReport = useCallback(async () => {
    if (!onViewReport || !currentGuestReportId) return;

    try {
      const data = await fetchCompleteReport(currentGuestReportId);
      if (!data) throw new Error('No data returned from edge function');

      const { report_content, swiss_data, guest_report, metadata } = data;
      const reportType = guest_report.report_type;
      const contentType = metadata?.content_type;

      const isAstro = contentType === 'astro' || contentType === 'both';
      const isAi = contentType === 'ai' || contentType === 'both';

      if (isAi && (!report_content || !swiss_data)) return;
      if (isAstro && !swiss_data) return;

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
      onViewReport?.('Failed to load report content.', null, null, false, false);
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
      const cleanup = setupRealtimeListener(currentGuestReportId, () => {
        if (!modalTriggered) {
          setModalTriggered(true);
          handleViewReport();
        }
      });
      return cleanup;
    } else {
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

        localStorage.removeItem('currentGuestReportId');
        window.history.replaceState({}, '', window.location.pathname);
        setError('No report ID detected. Please restart the process.');
      };

      handleMissingId();
    }
  }, [currentGuestReportId, fetchReport, setupRealtimeListener, handleViewReport, modalTriggered, email]);

  useEffect(() => {
    if (!error && isVideoReady && !modalTriggered) {
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
  }, [countdown, isVideoReady, error, modalTriggered, currentGuestReportId, triggerErrorHandling]);

  const status = (() => {
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
  })();

  const StatusIcon = status.icon;

  const handleBackToForm = () => {
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
              {!error && <div className="text-3xl font-light text-gray-900">{countdown}s</div>}
              <div className="text-gray-600 font-light">{status.desc}</div>
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
            {!modalTriggered && <VideoLoader onVideoReady={() => setIsVideoReady(true)} />}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              Hi {firstName}! {error ? 'There was an issue with your report.' : 'We are working on your report.'} <br />
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleViewReport} className="bg-gray-900 hover:bg-gray-800 text-white font-light">View Report</Button>
              <Button variant="outline" onClick={handleBackToForm} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
