
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';

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
    const { data, error } = await supabase.functions.invoke('get-report-data', {
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
      console.time('[SS] modal open start');
      handleReportReady(data.data);
      console.timeEnd('[SS] modal open start');
    } else {
      logSuccessScreen('warn', 'Cached report data not ready', { guestReportId, data });
    }
  }, [guestReportId, handleReportReady]);



    // Immediate check — fire and forget (non-blocking)
  useEffect(() => {
    if (!guestReportId) return;

    (async () => {
      const { data } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestReportId)
        .maybeSingle();

      if (data) {
        logSuccessScreen('info', 'Signal found immediately, triggering fetch', { guestReportId });
        fetchCachedReport(); // no await - fire and forget
      }
    })();
  }, [guestReportId]);

  // Real-time listener (non-blocking)
  useEffect(() => {
    if (!guestReportId) return;

    logSuccessScreen('info', 'Setting up WebSocket listener', { guestReportId });
    
    const channel = supabase.channel(`ready:${guestReportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_ready_signals',
          filter: `guest_report_id=eq.${guestReportId}`
        },
        () => {
          logSuccessScreen('info', 'Signal received via socket', { guestReportId });
          console.time('WS→fetch start');
          fetchCachedReport().then(() => {
            console.timeEnd('WS→fetch start');
            logSuccessScreen('info', 'Unsubscribing from WebSocket after signal trigger', { guestReportId });
            channel.unsubscribe();
          });
        }
      )
      .subscribe(
         status => console.log('[SS] subscription status →', status)
      );

    // Cleanup function
    return () => {
      logSuccessScreen('info', 'Cleaning up WebSocket listener', { guestReportId });
      channel.unsubscribe();
    };
  }, [guestReportId]);

  // Independent countdown timer (aesthetics only)
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

    return () => {
      clearInterval(timer);
    };
  }, [countdownTime]);

  








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
