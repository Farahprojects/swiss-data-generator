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
  onViewReport?: (
    content: string,
    pdf?: string | null,
    swissData?: any,
    hasReport?: boolean,
    swissBoolean?: boolean,
    reportType?: string
  ) => void;
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

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [modalTriggered, setModalTriggered] = useState(false);
  const [fetchedReportData, setFetchedReportData] = useState<any>(null);
  const [errorHandlingTriggered, setErrorHandlingTriggered] = useState(false);

  const currentGuestReportId = useMemo(() => {
    return guestReportId || getGuestToken();
  }, [guestReportId]);

  if (!currentGuestReportId) {
    return (
      <div className="w-full py-10 px-4 flex justify-center">
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Session expired. Please start a new report.</p>
            <Button onClick={() => navigate('/report')} className="mt-4 bg-gray-900 text-white font-light hover:bg-gray-800">
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
  const hasProcessingError = !!error;

  const isReady = !hasSwissError && (
    (isAstroDataOnly && report?.swiss_boolean === true) ||
    (!isAstroDataOnly && !!report?.has_report)
  );

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  const handleViewReport = useCallback(async () => {
    console.log('🚀 View Report button clicked!', { currentGuestReportId, onViewReport });
    
    if (!onViewReport || !currentGuestReportId) {
      console.log('❌ Missing onViewReport callback or guest report ID');
      return;
    }

    try {
      console.log('📡 Fetching fresh report data...');
      const data = await fetchCompleteReport(currentGuestReportId);
      console.log('📋 Fetched data:', data);
      
      if (!data) {
        console.log('❌ No data returned from edge function');
        throw new Error('No data returned from edge function');
      }

      const { report_content, swiss_data, guest_report, metadata } = data;
      const reportType = guest_report.report_type;
      const hasSwiss = !!swiss_data;
      const hasAi = !!report_content;
      const contentType = metadata?.content_type;

      console.log('📊 Data summary:', {
        hasSwiss,
        hasAi,
        reportType,
        contentType,
        hasReportContent: !!report_content,
        hasSwissData: !!swiss_data
      });

      setFetchedReportData(data);

      const isAstro = contentType === 'astro' || contentType === 'both';
      const isAi = contentType === 'ai' || contentType === 'both';

      console.log('🎯 Opening modal with data:', {
        content: report_content ? 'Present' : 'Missing',
        swiss_data: swiss_data ? 'Present' : 'Missing',
        isAi,
        isAstro,
        reportType
      });

      // Always open the modal with whatever data we have - let the modal handle what to display
      onViewReport(
        report_content || 'No content available', 
        null, 
        swiss_data, 
        hasAi, 
        isAstro, 
        reportType
      );
    } catch (error) {
      console.error('❌ Error in handleViewReport:', error);
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
    }
  }, [currentGuestReportId, fetchReport]);

  // Check if report is ready immediately for AI reports
  useEffect(() => {
    const checkIfReportReady = async () => {
      if (!report || modalTriggered || !currentGuestReportId) return;
      
      // For AI reports, check if report is ready immediately
      if (isReady && !modalTriggered) {
        setModalTriggered(true);
        try {
          const data = await fetchCompleteReport(currentGuestReportId);
          if (data) {
            setFetchedReportData(data);
          }
        } catch (error) {}
        handleViewReport();
      }
    };

    checkIfReportReady();
  }, [report, isReady, modalTriggered, currentGuestReportId, fetchCompleteReport, handleViewReport]);

  // 🔥 Check report_logs for reliable error detection
  useEffect(() => {
    const checkReportError = async () => {
      if (!currentGuestReportId || errorHandlingTriggered || caseNumber) return;
      
      try {
        const { data: reportLog, error } = await supabase
          .from('report_logs')
          .select('has_error, error_message')
          .eq('user_id', currentGuestReportId)
          .maybeSingle();
          
        if (!error && reportLog?.has_error) {
          console.warn('🚨 Error detected in report_logs:', reportLog.error_message);
          setErrorHandlingTriggered(true);
          triggerErrorHandling(currentGuestReportId);
        }
      } catch (err) {
        console.error('Error checking report_logs:', err);
      }
    };

    if (report?.payment_status === 'paid') {
      checkReportError();
    }
  }, [report, currentGuestReportId, errorHandlingTriggered, caseNumber, triggerErrorHandling]);

  const status = (() => {
    if (hasSwissError) return { title: 'We\'re sorry', desc: 'Technical issue encountered', icon: CheckCircle };
    if (!report) return { title: 'Processing Your Request', desc: 'Setting up your report', icon: Clock };
    if (report.payment_status === 'pending') return { title: 'Payment Processing', desc: 'Confirming payment', icon: Clock };
    if (report.payment_status === 'paid' && !report.has_report) return { title: 'Generating Report', desc: 'Preparing insights', icon: Clock };
    if (isReady) return { title: 'Report Ready!', desc: 'Your report is complete', icon: CheckCircle };
    return { title: '', desc: 'Please wait', icon: Clock };
  })();

  const StatusIcon = status.icon;

  const handleBackToForm = () => {
    clearAllSessionData();
    navigate('/report');
  };

  const handleContactSupport = () => {
    const errorMessage = `Hi, I'm experiencing an issue with my report generation.\n\nReport Details:\n- Name: ${name}\n- Email: ${email}\n- Report ID: ${currentGuestReportId || 'N/A'}\n- Case Number: ${caseNumber || 'N/A'}\n- Time: ${new Date().toLocaleString()}\n`;
    localStorage.setItem('contactFormPrefill', JSON.stringify({ name, email, subject: 'Report Issue', message: errorMessage }));
    navigate('/contact');
  };

  return (
    <div data-success-screen className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {(hasSwissError || hasProcessingError) ? (
              <>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <StatusIcon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
                  <p className="text-gray-600 font-light">{status.desc}</p>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-gray-800 font-medium">
                    We are having technical issues, your case has been logged as: {caseNumber || 'Processing...'}
                  </p>
                  <p className="text-gray-600">We will send you an email within 24 hours.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={handleContactSupport} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Contact Support
                  </Button>
                  <Button variant="outline" onClick={handleBackToForm} className="border-gray-900 text-gray-900 font-light hover:bg-gray-100">
                    Back to Home
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <StatusIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-gray-600 font-light">Processing...</div>
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
                      Hi {firstName}! Your report is ready.<br />
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
