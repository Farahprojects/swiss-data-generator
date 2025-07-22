
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';
import { supabase } from '@/integrations/supabase/client';
import { logSuccessScreen } from '@/utils/logUtils';
import { clearAllSessionData } from '@/utils/urlHelpers';
import { useGuestReportStatus } from '@/hooks/useGuestReportStatus';
import { useToast } from '@/hooks/use-toast';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportData: ReportData) => void;
  onReportReady?: (callback: (reportData: ReportData) => void) => void;
  guestReportId?: string;
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
  const { toast } = useToast();

  // Simple visual countdown (24 seconds for UX)
  const [countdownTime, setCountdownTime] = useState(24);
  const [reportReady, setReportReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Use the existing error handling system
  const { 
    error, 
    caseNumber, 
    triggerErrorHandling,
    setError,
    setCaseNumber 
  } = useGuestReportStatus();

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

    requestAnimationFrame(() => {
      setTimeout(scrollToSuccess, 100);
    });
  }, []);

  // Handle smart error display via toast notifications - with ref to prevent infinite loops
  const errorHandledRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (error && !reportReady && error !== errorHandledRef.current) {
      errorHandledRef.current = error;
      
      let errorTitle = "Processing Error";
      let errorDescription = error;
      
      // Smart error detection based on error message content
      if (error.includes('Swiss') || error.includes('swiss')) {
        errorTitle = "Swiss Data Processing Error";
        errorDescription = caseNumber 
          ? `Swiss processing failed. Reference case #${caseNumber} if contacting support.`
          : "Swiss data processing encountered an issue. Logging error for investigation.";
      } else if (error.includes('timeout') || error.includes('not found')) {
        errorTitle = "Report Generation Timeout";
        errorDescription = caseNumber
          ? `Report generation timed out. Reference case #${caseNumber} if contacting support.`
          : "Report generation is taking longer than expected.";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDescription
      });

      // Clear session data for error states that require cleanup
      if (error.includes('Swiss') || error.includes('swiss')) {
        logSuccessScreen('info', 'Cleaning up session due to Swiss error');
        clearAllSessionData();
      }
    }
  }, [error, caseNumber, reportReady]);

  // Handle report ready from parent component
  const handleReportReady = useCallback((reportData: ReportData) => {
    logSuccessScreen('info', 'Report ready signal received, opening modal');
    setReportReady(true);
    setCountdownTime(0);
    
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
    if (!guestReportId || error) return;

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
  }, [guestReportId, handleReportReady, error]);

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
        
        const { data, error: checkError } = await supabase.functions.invoke('check-report-status', {
          body: { guest_report_id: guestReportId }
        });

        if (checkError) {
          console.error('❌ Error checking report status:', checkError);
          setCheckingStatus(false);
          return;
        }

        // Handle error state responses from check-report-status
        if (data?.error_state) {
          logSuccessScreen('info', 'Error state detected from check-report-status', { errorState: data.error_state });
          
          // Smart error handling based on error type
          if (data.error_state.type === 'swiss_processing_error') {
            if (data.error_state.case_number) {
              // Error already logged with case number
              setCaseNumber(data.error_state.case_number);
              setError('Swiss data processing failed. Your case has been logged for investigation.');
            } else if (data.error_state.requires_error_logging) {
              // New error that needs logging
              setError('Swiss data processing failed. Logging your case for investigation.');
              await triggerErrorHandling(
                data.error_state.guest_report_id,
                'swiss_processing_error',
                'Swiss data processing failed due to stack depth limit or malformed data'
              );
            }
          } else {
            setError(data.error_state.message || 'An error occurred during report processing.');
            if (data.error_state.guest_report_id) {
              await triggerErrorHandling(
                data.error_state.guest_report_id,
                data.error_state.type || 'unknown_error',
                data.error_state.message
              );
            }
          }
          
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
  }, [guestReportId, handleReportReady, triggerErrorHandling, setError, setCaseNumber]);

  // Pure visual countdown timer - only starts after status check is complete
  useEffect(() => {
    if (reportReady || checkingStatus || error) return;

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
  }, [reportReady, checkingStatus, error]);

  // Don't render anything if there's an error - let toast handle it
  if (error) {
    return null;
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
