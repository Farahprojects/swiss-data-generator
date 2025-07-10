import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { getGuestReportId, clearAllSessionData } from '@/utils/urlHelpers';
import { useCountdown } from '@/hooks/useCountdown';
import { useReportReadiness } from '@/hooks/useReportReadiness';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { VideoLoader } from './VideoLoader';
import { getReportStatus, isAstroOnlyType } from '@/utils/reportStatusChecker';
import { handleMissingReportId } from '@/utils/errorHandler';

type ReportType = 'essence' | 'sync';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (content: string, pdf?: string | null, swissData?: any, hasReport?: boolean, swissBoolean?: boolean, reportType?: string) => void;
  guestReportId?: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ name, email, onViewReport, guestReportId }) => {
  const {
    report,
    fetchReport,
    fetchCompleteReport,
    setupRealtimeListener,
  } = useGuestReportStatus();

  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useViewportHeight();

  // State management
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [modalTriggered, setModalTriggered] = useState(false);
  const [fetchedReportData, setFetchedReportData] = useState<any>(null);

  // Core data
  const currentGuestReportId = useMemo(() => {
    return guestReportId || getGuestReportId();
  }, [guestReportId]);

  const reportType = report?.report_type as ReportType | undefined;
  const isAstroDataOnly = isAstroOnlyType(reportType);

  // Custom hooks for state management
  const { error, caseNumber, triggerError, clearError, clearErrorOnReady, setError, setCaseNumber } = useErrorHandling();
  const isReady = useReportReadiness(report, fetchedReportData, reportType);

  // Auto-clear error when report becomes ready
  useEffect(() => {
    if (isReady && error) {
      clearErrorOnReady();
    }
  }, [isReady, error, clearErrorOnReady]);

  // Define the primary UI state with priority logic
  const primaryState = useMemo(() => {
    console.log('🎯 Determining primary state:', { isReady, error: !!error, currentGuestReportId: !!currentGuestReportId });
    
    if (error) return 'error';
    if (isReady) return 'ready';
    if (currentGuestReportId) return 'processing';
    return 'loading';
  }, [isReady, error, currentGuestReportId]);

  // Countdown management - only start when we have ID but report isn't ready
  const shouldStartCountdown = primaryState === 'processing' && isVideoReady;
  console.log('🔄 Countdown conditions:', { primaryState, isVideoReady, shouldStartCountdown });
  
  const { countdown } = useCountdown(24, shouldStartCountdown, () => {
    console.log('⏰ Countdown completed, triggering error');
    if (currentGuestReportId) {
      triggerError(currentGuestReportId, 'timeout_no_report', 'Report not found after timeout', email);
    }
  });

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
    } else {
      // Handle missing ID scenario with a grace period for page loads
      console.warn('🚨 No guest report ID found - waiting briefly before error handling');
      const gracePeriod = setTimeout(async () => {
        // Check one more time after page settles
        const retryId = getGuestReportId();
        if (!retryId) {
          console.error('❌ No guest report ID found after grace period');
          const caseNumber = await handleMissingReportId(email);
          setCaseNumber(caseNumber);
          setError('No report ID detected. Please restart the process.');
        }
      }, 2000); // 2 second grace period
      
      return () => clearTimeout(gracePeriod);
    }
  }, [currentGuestReportId, fetchReport, setupRealtimeListener, handleViewReport, modalTriggered, email, setCaseNumber, setError]);

  // Debug useEffect - log state changes
  useEffect(() => {
    console.log('📊 Success Screen State:', {
      primaryState,
      currentGuestReportId: !!currentGuestReportId,
      reportType,
      isReady,
      error: !!error,
      isVideoReady,
      reportHasReport: report?.has_report,
      reportSwissBoolean: report?.swiss_boolean,
      reportPaymentStatus: report?.payment_status
    });
  }, [primaryState, currentGuestReportId, reportType, isReady, error, isVideoReady, report]);


  // Status and UI state
  const status = getReportStatus(report, isReady, error);
  const StatusIcon = status.icon === 'CheckCircle' ? CheckCircle : Clock;

  const handleTryAgain = async () => {
    if (currentGuestReportId) {
      clearError();
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
              {primaryState === 'processing' && (
                <>
                  <div className="text-3xl font-light text-gray-900">{countdown}s</div>
                  <div className="text-gray-600 font-light">Report generating...</div>
                </>
              )}
              {primaryState === 'ready' && <div className="text-gray-600 font-light">Ready to view</div>}
              {primaryState === 'error' && <div className="text-gray-600 font-light">Processing issue detected</div>}
              {primaryState === 'loading' && <div className="text-gray-600 font-light">Initializing...</div>}
            </div>
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">{status.title}</h2>
              <p className="text-gray-600 font-light">{status.desc}</p>
            </div>
            {primaryState === 'processing' && !isAstroDataOnly && (
              <>
                <VideoLoader onVideoReady={handleVideoReady} />
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! We're working on your report.<br />
                  <span className="font-medium">{email}</span>
                </div>
              </>
            )}
            {primaryState === 'ready' && (
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
            {primaryState === 'error' && (
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
