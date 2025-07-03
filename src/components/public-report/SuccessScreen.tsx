import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VIDEO_SRC =
  'https://auth.theraiastro.com/storage/v1/object/public/therai-assets/loading-video.mp4';
const COLOR_BLUE = 'text-blue-600';
const COLOR_GREEN = 'text-green-600';

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------
const VideoLoader: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false); // Start unmuted for audio

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    // On some browsers, volume resets when muted flips – make sure it’s audible
    if (!vid.muted) vid.volume = 1;
    setIsMuted(!isMuted);
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
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  name,
  email,
  onViewReport,
  autoStartPolling = true,
}) => {
  // ---------------------------------------------------------------------------
  // Hooks & State
  // ---------------------------------------------------------------------------
  const { report, isPolling, error, caseNumber, startPolling, stopPolling, triggerErrorHandling } = useGuestReportStatus();
  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();

  useViewportHeight();

  const [countdown, setCountdown] = useState(24);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const redirectRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Polling lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (autoStartPolling && email && !isPolling) startPolling(email);
    return () => stopPolling();
  }, [autoStartPolling, email]);

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------
  const getStatus = useCallback(() => {
    if (!report) {
      return { step: 1, title: 'Processing Your Request', desc: "We're setting up your personalized report", progress: 10, icon: Clock, color: COLOR_BLUE };
    }
    if (report.payment_status === 'pending') {
      return { step: 1, title: 'Payment Processing', desc: 'Confirming your payment details', progress: 25, icon: Clock, color: COLOR_BLUE };
    }
    if (report.payment_status === 'paid' && !report.has_report) {
      return { step: 2, title: 'Generating Your Report', desc: 'Our AI is crafting your personalized insights', progress: 60, icon: Clock, color: COLOR_BLUE };
    }
    if (report.has_report && report.report_content) {
      return { step: 3, title: 'Report Ready!', desc: 'Your personalized report is complete', progress: 100, icon: CheckCircle, color: COLOR_GREEN };
    }
    return { step: 1, title: 'Processing', desc: 'Please wait while we prepare your report', progress: 30, icon: Clock, color: COLOR_BLUE };
  }, [report]);

  const status = getStatus();
  const StatusIcon = status.icon;
  const isReady = report?.has_report && !!report?.report_content;

  // ---------------------------------------------------------------------------
  // Countdown logic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isReady) setCountdown(24);
  }, [status.step, isReady]);

  useEffect(() => {
    if (!isReady && countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1_000);
    } else if (!isReady && countdown === 0 && !caseNumber && email) {
      // Only trigger error handling when countdown reaches 0 and no case number yet
      console.log('🚨 Countdown finished, no report found, triggering error handling');
      triggerErrorHandling(email);
    }
    return () => countdownRef.current && clearTimeout(countdownRef.current);
  }, [countdown, isReady, caseNumber, email, triggerErrorHandling]);

  // ---------------------------------------------------------------------------
  // Auto redirect when ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isReady && onViewReport) {
      redirectRef.current = setTimeout(
        () => onViewReport(report!.report_content!, report!.report_pdf_data),
        2_000,
      );
    }
    return () => redirectRef.current && clearTimeout(redirectRef.current);
  }, [isReady, onViewReport, report]);

  // ---------------------------------------------------------------------------
  // Retry helper
  // ---------------------------------------------------------------------------
  const retry = () => email && !isPolling && startPolling(email);

  // ---------------------------------------------------------------------------
  // Shared blocks
  // ---------------------------------------------------------------------------
  const Countdown = (
    <div className="text-center">
      <div className="text-4xl font-bold text-primary mb-1">{countdown}s</div>
      <p className="text-sm text-muted-foreground">Report generating…</p>
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
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        We're Looking Into This
      </h3>
      <p className="text-sm text-red-700 mb-3">{error}</p>
      {caseNumber && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium text-red-800">
            Case Number: <span className="font-mono">{caseNumber}</span>
          </p>
          <p className="text-xs text-red-600 mt-1">
            Please reference this case number if you contact support.
          </p>
        </div>
      )}
      {!caseNumber && (
        <Button onClick={retry} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
          Retry
        </Button>
      )}
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
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {/* Status Icon */}
            <motion.div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                isReady ? 'bg-green-100' : 'bg-blue-100'
              }`}
              animate={isReady ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              <StatusIcon className={`h-8 w-8 ${status.color}`} />
            </motion.div>

            {/* Title / desc */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{status.title}</h2>
              <p className="text-muted-foreground">{status.desc}</p>
            </div>


            {/* Content while generating */}
            {!isReady && !caseNumber && (
              <>
                {Countdown}
                <VideoLoader />
                {PersonalNote}
              </>
            )}

            {/* Ready state */}
            {isReady && (
              <>
                {PersonalNote}
                <Button onClick={() => onViewReport?.(report!.report_content!, report!.report_pdf_data)}>
                  View now
                </Button>
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
