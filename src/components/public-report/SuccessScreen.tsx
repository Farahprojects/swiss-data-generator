
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
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  // Single call opens modal (with duplicate prevention)
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  
  const handleReportReady = useCallback((reportData: ReportData) => {
    if (hasOpenedModal) return; // Prevent duplicate opens
    
    logSuccessScreen('info', 'Report ready signal received, opening modal');
    console.info('[SuccessScreen] about to open modal', reportData);
    
    // 6. Modal context hook
    console.log('[ModalCTX] open() called with', reportData);
    
    setCountdownTime(0);
    setHasOpenedModal(true);
    open(reportData); // <- single call opens modal
  }, [open, hasOpenedModal]);

  // fetchCachedReport helper function
  const fetchCachedReport = useCallback(async () => {
    if (!guestReportId) return;
    
    logSuccessScreen('info', 'Fetching cached report data', { guestReportId });
    
    // 5. Fetch layer timing
    console.time('[SS] fetchCachedReport');
    const { data, error } = await supabase.functions.invoke('get-cached-report-data', {
      body: { guest_report_id: guestReportId }
    });
    console.timeEnd('[SS] fetchCachedReport');   // measure latency
    console.log('[SS] cached-response', {data, error});
    
    if (error) {
      logSuccessScreen('error', 'Error fetching cached report data', { guestReportId, error });
      console.error('❌ Error fetching cached report data:', error);
      return;
    }
    
    if (data?.ready && data?.data) {
      logSuccessScreen('info', 'Cached report data fetched successfully, opening modal', { guestReportId });
      handleReportReady(data.data);
    } else {
      logSuccessScreen('warn', 'Cached report data not ready', { guestReportId, data });
    }
  }, [guestReportId, handleReportReady]);

  // --- early synchronous check -------------
  // This runs before React renders, ensuring we catch modal_ready if it's already true
  React.useEffect(() => {
    if (!guestReportId) return;

        const checkReportReadyImmediately = async () => {
      logSuccessScreen('info', 'Performing immediate report_logs is_guest check', { guestReportId });

      const { data } = await supabase
        .from('report_logs')
        .select('is_guest')
        .eq('is_guest', true)
        .maybeSingle();

      // 2. SuccessScreen "early check" logging
      console.log('[SS] immediate DB check result →', data?.is_guest);

      if (data?.is_guest === true) {
        logSuccessScreen('info', 'Guest report already ready in report_logs, opening modal immediately', { guestReportId });
        await fetchCachedReport(); // opens the modal immediately
        return; // modal now open; skip listener
      } else {
        logSuccessScreen('info', 'Guest report not yet ready in report_logs, will wait for WebSocket updates', { guestReportId });
      }
    };
    
    // DISABLED FOR TESTING - Immediate check commented out
    // checkReportReadyImmediately();

    // checkReportReadyImmediately();
  }, [guestReportId, fetchCachedReport]);

      // WebSocket listener for report_logs where is_guest = true
      // DISABLED FOR TESTING - WebSocket subscription commented out
      /*
  useEffect(() => {
    if (!guestReportId) return;

    logSuccessScreen('info', 'Setting up WebSocket listener for report_logs is_guest', { guestReportId });
    
    // 3. WebSocket lifecycle logging
    const channel = supabase.channel(`guest_report_modal:${guestReportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_logs',
          filter: `is_guest=eq.true`
        },
        (payload) => {
          logSuccessScreen('info', 'WebSocket received report_logs insert', { 
            guestReportId, 
            payload: payload,
            newRecord: payload.new
          });
          
          const newRecord = payload.new as any;
          
          // Check if this is a guest report that's ready
          if (newRecord?.is_guest === true) {
            logSuccessScreen('info', 'Guest report ready in report_logs, opening modal', { guestReportId });
            
            // Fetch the cached report data and open modal
            fetchCachedReport().then(() => {
              // Clean up the listener immediately after opening modal
              logSuccessScreen('info', 'Unsubscribing from WebSocket after report_logs trigger', { guestReportId });
              channel.unsubscribe();
            });
          } else {
            logSuccessScreen('debug', 'WebSocket update received but is_guest condition not met', { 
              guestReportId,
              isGuest: newRecord?.is_guest
            });
          }
        }
      )
      .subscribe(
         status => console.log('[SS] subscription status →', status)
      );

    // ALSO listen for low-level socket errors
    console.log('[SS] realtime client available:', !!supabase.realtime);
    
    // Enable realtime debug logs (if available)
    try {
      (supabase.realtime as any).setDebug?.(true);
    } catch (e) {
      console.log('[SS] realtime debug not available');
    }
    
    // Set authentication parameters for RLS
    // channel.setAuth({ guest_report_id: guestReportId }); // This line is removed

    // Cleanup function
    return () => {
      logSuccessScreen('info', 'Cleaning up WebSocket listener', { guestReportId });
      channel.unsubscribe();
    };
  }, [guestReportId, fetchCachedReport]);
  */

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
                  <div className="text-3xl font-light text-gray-900 mb-2">{countdownTime}s</div>
                  <p className="text-sm text-gray-600">Generating your report...</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is being prepared.<br />
                  <span className="font-medium">{email}</span>
                </div>

                <EntertainmentWindow 
                  mode="text"
                  className="mb-4"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;
