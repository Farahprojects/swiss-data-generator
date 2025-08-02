
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';
import ErrorStateHandler from './ErrorStateHandler';
import { supabase } from '@/integrations/supabase/client';
import { logSuccessScreen } from '@/utils/logUtils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useGuestSessionManager } from '@/hooks/useGuestSessionManager';

interface SuccessScreenProps {
  name: string;
  email: string;
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
  guestReportId,
  onStartWaiting
}) => {
  const firstName = name?.split(' ')[0] || 'there';
  const { open } = useReportModal();
  const { handleSessionReset } = useGuestSessionManager(guestReportId);

  // Guard against missing guest report ID
  if (!guestReportId) {
    console.warn('[SuccessScreen] No guestReportId provided, delegating to session manager');
    
    // Delegate to centralized session manager
    handleSessionReset('success_screen_missing_guest_id');
    
    // Show a brief loading state before redirect
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-4xl">
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardContent className="p-8 text-center space-y-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-light text-gray-900 mb-2">Redirecting...</div>
                <p className="text-sm text-gray-600">Taking you back to the homepage</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Simple states
  const [countdownTime, setCountdownTime] = useState(24);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  // Single call opens modal (with duplicate prevention)
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  
  const handleReportReady = useCallback((reportData: ReportData) => {
    if (hasOpenedModal) return; // Prevent duplicate opens
    
    logSuccessScreen('info', 'Report ready signal received, opening modal');
    console.info('[SuccessScreen] about to open modal', reportData);
    setCountdownTime(0);
    setHasOpenedModal(true);
    open(reportData); // <- single call opens modal
  }, [open, hasOpenedModal]);

  // WebSocket listener for modal_ready changes
  useEffect(() => {
    if (!guestReportId) return;

    logSuccessScreen('info', 'Setting up WebSocket listener for modal_ready', { guestReportId });
    
    const channel = supabase.channel(`guest_report_modal:${guestReportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_reports',
          filter: `id=eq.${guestReportId}`
        },
        (payload) => {
          logSuccessScreen('info', 'WebSocket received update', { 
            guestReportId, 
            payload: payload,
            newRecord: payload.new,
            oldRecord: payload.old
          });
          
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if modal_ready flipped from false/null to true
          if (!oldRecord?.modal_ready && newRecord?.modal_ready === true) {
            logSuccessScreen('info', 'modal_ready flipped to true, opening modal', { guestReportId });
            
            // Fetch the cached report data (already prepared by orchestrate-report-ready)
            supabase.functions.invoke('get-cached-report-data', {
              body: { guest_report_id: guestReportId }
            }).then(({ data, error }) => {
              if (error) {
                console.error('❌ Error fetching cached report data after modal_ready:', error);
                return;
              }
              
              if (data?.ready && data?.data) {
                logSuccessScreen('info', 'Cached report data fetched successfully, opening modal', { guestReportId });
                handleReportReady(data.data);
              } else {
                logSuccessScreen('warn', 'Cached report data not ready after modal_ready trigger', { guestReportId, data });
              }
            }).catch(err => {
              console.error('❌ Failed to fetch cached report data after modal_ready:', err);
            });
            
            // Clean up the listener immediately
            logSuccessScreen('info', 'Unsubscribing from WebSocket after modal_ready trigger', { guestReportId });
            channel.unsubscribe();
          } else {
            logSuccessScreen('debug', 'WebSocket update received but modal_ready condition not met', { 
              guestReportId,
              oldModalReady: oldRecord?.modal_ready,
              newModalReady: newRecord?.modal_ready
            });
          }
        }
      )
      .subscribe((status) => {
        logSuccessScreen('info', 'WebSocket subscription status', { guestReportId, status });
      });

    // Cleanup function
    return () => {
      logSuccessScreen('info', 'Cleaning up WebSocket listener', { guestReportId });
      channel.unsubscribe();
    };
  }, [guestReportId, handleReportReady]);

  // Start waiting for report when component mounts (separate from listener)
  useEffect(() => {
    if (onStartWaiting) {
      logSuccessScreen('info', 'Starting to wait for report');
      onStartWaiting();
    }
  }, [onStartWaiting]);


  // Simple error handlers
  const handleTriggerErrorLogging = useCallback(async (guestReportId: string, email: string) => {
    // Let ErrorStateHandler handle the error logging
  }, []);

  const handleCleanupSession = useCallback(() => {
    // Let ErrorStateHandler handle cleanup
  }, []);

  // Independent countdown timer
  useEffect(() => {
    if (countdownTime === 0) return; // Already done

    const timer = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fallback timeout after 24 seconds
    const fallbackTimeout = setTimeout(() => {
      console.warn('⏱️ Timeout reached. Report modal never appeared.');
    }, 24000);

    return () => {
      clearInterval(timer);
      clearTimeout(fallbackTimeout);
    };
  }, [countdownTime]);

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
              <div className="w-full max-w-4xl">
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {countdownTime === 0 ? (
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
                      <div className="text-3xl font-light text-gray-900 mb-2">{countdownTime}s</div>
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
