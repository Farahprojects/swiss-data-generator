
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';
import ErrorStateHandler from './ErrorStateHandler';
import { supabase } from '@/integrations/supabase/client';
import { logSuccessScreen } from '@/utils/logUtils';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportData: ReportData) => void;
  guestReportId?: string;
  onStartWaiting?: () => void;
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
  guestReportId,
  onStartWaiting
}) => {
  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();

  // Simple states
  const [reportReady, setReportReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [waitForReport, setWaitForReport] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  // Start waiting for report when component mounts
  useEffect(() => {
    if (onStartWaiting) {
      logSuccessScreen('info', 'Starting to wait for report');
      onStartWaiting();
      setWaitForReport(true);
      setPollingActive(true);
    }
  }, [onStartWaiting]);

  // Simple modal trigger - no callbacks
  const handleReportReady = useCallback((reportData: ReportData) => {
    console.log('✅ handleReportReady called with:', reportData);
    logSuccessScreen('info', 'Report ready signal received, opening modal');
    setReportReady(true);
    setPollingActive(false); // Stop polling when report is ready
    
    if (onViewReport) {
      logSuccessScreen('info', 'Calling onViewReport with report data');
      onViewReport(reportData);
    } else {
      logSuccessScreen('warn', 'onViewReport callback not available');
    }
  }, [onViewReport]);

  // Conditional realtime listener - only listens when waitForReport is true
  useEffect(() => {
    if (!waitForReport || !guestReportId) return;

    logSuccessScreen('info', 'Setting up conditional realtime listener for report ready', { guestReportId });
    
    const channel = supabase
      .channel(`guest_report:${guestReportId}`)
      .on('broadcast', { event: 'report_ready' }, (payload) => {
        console.log('🔥 Received report_ready broadcast:', payload);
        logSuccessScreen('debug', 'Realtime message received from orchestrator', { payload });
        
        if (payload?.payload?.data) {
          logSuccessScreen('info', 'Orchestrator sent report data, triggering modal');
          setWaitForReport(false); // Clear the flag to prevent duplicate listeners
          setPollingActive(false); // Stop polling
          handleReportReady(payload.payload.data);
        } else {
          console.warn('⚠️ Broadcast payload missing nested data field:', payload);
        }
      })
      .subscribe((status) => {
        logSuccessScreen('debug', 'Realtime subscription status', { status });
      });

    return () => {
      logSuccessScreen('debug', 'Cleaning up conditional realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [waitForReport, guestReportId, handleReportReady]);

  // Database polling for modal_ready flag - immediate report display
  useEffect(() => {
    if (!pollingActive || !guestReportId || reportReady) return;

    logSuccessScreen('info', 'Starting database polling for modal_ready flag');

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('guest_reports')
          .select('modal_ready, report_data')
          .eq('id', guestReportId)
          .single();

        if (error) {
          console.error('❌ Error polling modal_ready:', error);
          return;
        }

        if (data?.modal_ready && data?.report_data) {
          logSuccessScreen('info', 'modal_ready detected! Showing report immediately');
          setPollingActive(false);
          handleReportReady(data.report_data as unknown as ReportData);
        }
      } catch (err) {
        console.error('❌ Polling error:', err);
      }
    }, 1500); // Poll every 1.5 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [pollingActive, guestReportId, reportReady, handleReportReady]);

  // Simple error logging for new errors detected by edge function
  const handleTriggerErrorLogging = useCallback(async (guestReportId: string, email: string) => {
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
        logSuccessScreen('info', 'Error logged successfully', { caseNumber: data.case_number });
        
        setErrorState(prev => prev ? {
          ...prev,
          case_number: data.case_number,
          logged_at: new Date().toISOString()
        } : null);
      }
    } catch (err) {
      logSuccessScreen('error', 'Failed to log error', { err });
    }
  }, []);

  // Session cleanup - let the edge function handle this
  const handleCleanupSession = useCallback(() => {
    logSuccessScreen('info', 'Cleaning up session due to error');
    // The edge function will handle any necessary cleanup
  }, []);

  // Check if report is ready using the smart edge function
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

        // Handle error state responses from the smart edge function
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

  // No countdown needed - using direct database polling

  // Show error state if detected by the edge function
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/20">
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
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
                <div className="text-center mb-6">
                  {checkingStatus ? (
                    <>
                      <div className="text-3xl font-light text-gray-900 mb-2">...</div>
                      <p className="text-sm text-gray-600">Checking report status...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-light text-gray-900 mb-2">⏳</div>
                      <p className="text-sm text-gray-600">Generating your report...</p>
                    </>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is being prepared.<br />
                  <span className="font-medium">{email}</span>
                </div>

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
