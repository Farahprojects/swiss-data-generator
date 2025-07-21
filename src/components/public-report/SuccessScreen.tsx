
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';
import { supabase } from '@/integrations/supabase/client';

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

  // Simple visual countdown (24 seconds for UX)
  const [countdownTime, setCountdownTime] = useState(24);
  const [reportReady, setReportReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Handle report ready from parent component
  const handleReportReady = useCallback((reportData: ReportData) => {
    console.log('🎯 Report ready signal received');
    setReportReady(true);
    setCountdownTime(0);
    
    // Open modal with provided data
    if (onViewReport) {
      onViewReport(reportData);
    }
  }, [onViewReport]);

  // Register callback with parent component
  useEffect(() => {
    if (onReportReady) {
      onReportReady(handleReportReady);
    }
  }, [onReportReady, handleReportReady]);

  // Listen for realtime messages from orchestrator
  useEffect(() => {
    if (!guestReportId) return;

    console.log('🔄 Setting up realtime listener for guest report:', guestReportId);
    
    const channel = supabase
      .channel(`guest_report:${guestReportId}`)
      .on('broadcast', { event: 'report_ready' }, (payload) => {
        console.log('📡 Realtime message received from orchestrator:', payload);
        
        if (payload.payload && payload.payload.data) {
          console.log('✅ Orchestrator sent report data, opening modal...');
          handleReportReady(payload.payload.data);
        } else {
          console.warn('❌ Orchestrator message missing data:', payload);
        }
      })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [guestReportId, handleReportReady]);

  // Check if report is already ready immediately on mount
  useEffect(() => {
    const checkReportStatus = async () => {
      if (!guestReportId) {
        console.log('❌ No guest report ID available for status check');
        setCheckingStatus(false);
        return;
      }

      try {
        console.log('🔍 Checking if report is already ready...');
        
        const { data, error } = await supabase.functions.invoke('check-report-status', {
          body: { guest_report_id: guestReportId }
        });

        if (error) {
          console.error('❌ Error checking report status:', error);
          setCheckingStatus(false);
          return;
        }

        if (data?.ready && data?.data) {
          console.log('✅ Report is already ready! Opening immediately...');
          handleReportReady(data.data);
        } else {
          console.log('⏳ Report not ready yet, waiting for orchestrator...');
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
    if (reportReady || checkingStatus) return;

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
  }, [reportReady, checkingStatus]);

  return (
    <div className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
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
