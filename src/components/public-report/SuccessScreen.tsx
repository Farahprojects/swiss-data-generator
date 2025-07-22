
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';
import ErrorStateHandler from './ErrorStateHandler';
import { supabase } from '@/integrations/supabase/client';
import { logSuccessScreen } from '@/utils/logUtils';
import { clearAllSessionData } from '@/utils/urlHelpers';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportData: ReportData) => void;
  onReportReady?: (callback: (reportData: ReportData) => void) => void;
  guestReportId?: string;
}

interface ErrorState {
  type: string;
  case_number?: string;
  message: string;
  logged_at?: string;
  requires_cleanup?: boolean;
  requires_error_logging?: boolean;
  guest_report_id?: string;
  email?: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ 
  name, 
  email, 
  onViewReport, 
  onReportReady,
  guestReportId 
}) => {
  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();
  const successCardRef = useRef<HTMLDivElement>(null);

  // Simple visual countdown (24 seconds for UX)
  const [countdownTime, setCountdownTime] = useState(24);
  const [reportReady, setReportReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [errorLogging, setErrorLogging] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  // Auto-scroll to success message once on mount
  useEffect(() => {
    const scrollToSuccess = () => {
      if (successCardRef.current) {
        successCardRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      setTimeout(scrollToSuccess, 100);
    });
  }, []);

  // Handle report ready from parent component
  const handleReportReady = useCallback((reportData: ReportData) => {
    logSuccessScreen('info', 'Report ready signal received, opening modal');
    setReportReady(true);
    setCountdownTime(0);
    
    // Immediately trigger the modal opening
    if (onViewReport) {
      logSuccessScreen('info', 'Calling onViewReport with report data');
      onViewReport(reportData);
    } else {
      logSuccessScreen('warn', 'onViewReport callback not available');
    }
  }, [onViewReport]);

  // Register callback with parent component immediately
  useEffect(() => {
    if (onReportReady) {
      logSuccessScreen('info', 'Registering handleReportReady callback with parent');
      onReportReady(handleReportReady);
    } else {
      logSuccessScreen('warn', 'onReportReady prop not provided');
    }
  }, [onReportReady, handleReportReady]);

  // Listen for realtime messages from orchestrator
  useEffect(() => {
    if (!guestReportId || errorState) return;

    logSuccessScreen('info', 'Setting up realtime listener for guest report', { guestReportId });
    
    const channel = supabase
      .channel(`guest_report:${guestReportId}`)
      .on('broadcast', { event: 'report_ready' }, (payload) => {
        logSuccessScreen('debug', 'Realtime message received from orchestrator', { payload });
        
        if (payload.payload && payload.payload.data) {
          logSuccessScreen('info', 'Orchestrator sent report data, triggering handleReportReady');
          handleReportReady(payload.payload.data);
        } else {
          console.warn('❌ Orchestrator message missing data:', payload);
        }
      })
      .subscribe((status) => {
        logSuccessScreen('debug', 'Realtime subscription status', { status });
      });

    return () => {
      logSuccessScreen('debug', 'Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [guestReportId, handleReportReady, errorState]);

  // Error logging handler
  const handleTriggerErrorLogging = useCallback(async (guestReportId: string, email: string) => {
    if (errorLogging || caseNumber) return; // Prevent duplicate logging
    
    setErrorLogging(true);
    logSuccessScreen('info', 'Triggering error logging for Swiss processing error');
    
    try {
      const { data, error } = await supabase.functions.invoke('log-user-error', {
        body: {
          guestReportId,
          errorType: 'swiss_processing_error',
          errorMessage: 'Swiss data processing failed due to stack depth limit or malformed data',
          email
        }
      });

      if (error) {
        logSuccessScreen('error', 'Error logging failed', { error });
      } else if (data?.case_number) {
        setCaseNumber(data.case_number);
        logSuccessScreen('info', 'Error logged successfully', { caseNumber: data.case_number });
        
        // Update error state with case number
        setErrorState(prev => prev ? {
          ...prev,
          case_number: data.case_number,
          logged_at: new Date().toISOString()
        } : null);
      }
    } catch (err) {
      logSuccessScreen('error', 'Failed to log error', { err });
    } finally {
      setErrorLogging(false);
    }
  }, [errorLogging, caseNumber]);

  // Session cleanup handler
  const handleCleanupSession = useCallback(() => {
    logSuccessScreen('info', 'Cleaning up session due to error');
    clearAllSessionData();
  }, []);

  // Check if report is already ready immediately on mount
  useEffect(() => {
    const checkReportStatus = async () => {
      if (!guestReportId) {
        logSuccessScreen('warn', 'No guest report ID available for status check');
        setCheckingStatus(false);
        return;
      }

      try {
        logSuccessScreen('debug', 'Checking if report is already ready');
        
        const { data, error } = await supabase.functions.invoke('check-report-status', {
          body: { guest_report_id: guestReportId }
        });

        if (error) {
          console.error('❌ Error checking report status:', error);
          setCheckingStatus(false);
          return;
        }

        // Handle error state responses
        if (data?.error_state) {
          logSuccessScreen('info', 'Error state detected from check-report-status', { errorState: data.error_state });
          setErrorState(data.error_state);
          setCheckingStatus(false);
          return;
        }

        if (data?.ready && data?.data) {
          logSuccessScreen('info', 'Report is already ready, triggering handleReportReady immediately');
          handleReportReady(data.data);
        } else {
          logSuccessScreen('debug', 'Report not ready yet, waiting for orchestrator');
        }
      } catch (err) {
        console.error('❌ Failed to check report status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkReportStatus();
  }, [guestReportId, handleReportReady]);

  // Pure visual countdown timer - only starts after status check is complete
  useEffect(() => {
    if (reportReady || checkingStatus || errorState) return;

    const timer = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reportReady, checkingStatus, errorState]);

  // Show error state if detected
  if (errorState) {
    return (
      <ErrorStateHandler
        errorState={errorState}
        onTriggerErrorLogging={handleTriggerErrorLogging}
        onCleanupSession={handleCleanupSession}
      />
    );
  }

  return (
    <div className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card ref={successCardRef} className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {reportReady ? (
              <>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">Report Ready!</h2>
                  <p className="text-gray-600 font-light">Opening your report...</p>
                </div>
              </>
            ) : (
              <>
                {/* Show checking status or countdown */}
                <div className="text-center mb-6">
                  {checkingStatus ? (
                    <>
                      <div className="text-3xl font-light text-gray-900 mb-2">...</div>
                      <p className="text-sm text-gray-600">Checking report status...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-light text-gray-900 mb-2">{countdownTime}s</div>
                      <p className="text-sm text-gray-600">Generating your report...</p>
                    </>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is being prepared.<br />
                  <span className="font-medium">{email}</span>
                </div>

                {/* Entertainment window during wait - only show after status check */}
                {!checkingStatus && (
                  <EntertainmentWindow 
                    mode="text"
                    className="mb-4"
                  />
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
