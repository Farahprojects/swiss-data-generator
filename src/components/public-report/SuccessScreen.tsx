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

const SuccessScreen: React.FC<SuccessScreenProps> = ({ name, email, guestReportId, onStartWaiting }) => {
  const firstName = name?.split(' ')[0] || 'there';
  const { open } = useReportModal();
  const { handleSessionReset } = useGuestSessionManager(guestReportId);
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  const [countdownTime, setCountdownTime] = useState(24);

  // Guard clause
  if (!guestReportId) {
    handleSessionReset('success_screen_missing_guest_id');
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-4xl">
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardContent className="p-8 text-center space-y-6">
              <div className="text-3xl font-light text-gray-900 mb-2">Redirecting...</div>
              <p className="text-sm text-gray-600">Taking you back to the homepage</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fetchAndOpenReport = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('get-report-data', {
      body: { guest_report_id: guestReportId },
    });

    if (error || !data?.ready || !data?.data) {
      logSuccessScreen('error', 'Error or incomplete data fetching report', { error, data });
      return;
    }

    open(data.data);
    setHasOpenedModal(true);
  }, [guestReportId, open]);

  // WebSocket subscription for report_ready_signals
  useEffect(() => {
    const channel = supabase.channel(`ready:${guestReportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_ready_signals',
          filter: `guest_report_id=eq.${guestReportId}`,
        },
        () => {
          if (!hasOpenedModal) {
            fetchAndOpenReport();
            channel.unsubscribe();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [guestReportId, fetchAndOpenReport, hasOpenedModal]);

  // Countdown UI fallback (purely visual)
  useEffect(() => {
    if (countdownTime === 0) return;
    const timer = setInterval(() => {
      setCountdownTime(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownTime]);

  useEffect(() => {
    if (onStartWaiting) onStartWaiting();
  }, [onStartWaiting]);

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
                <EntertainmentWindow mode="text" className="mb-4" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuccessScreen;

