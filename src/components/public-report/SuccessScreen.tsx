
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { getGuestToken } from '@/utils/urlHelpers';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { ReportData } from '@/utils/reportContentExtraction';
import EntertainmentWindow from './EntertainmentWindow';

interface SuccessScreenProps {
  name: string;
  email: string;
  onViewReport?: (reportData: ReportData) => void;
  guestReportId?: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ name, email, onViewReport, guestReportId }) => {
  const currentGuestReportId = guestReportId || getGuestToken();
  if (!currentGuestReportId) {
    return null;
  }

  const firstName = name?.split(' ')[0] || 'there';
  const isMobile = useIsMobile();

  // Simple visual countdown (24 seconds for UX)
  const [countdownTime, setCountdownTime] = useState(24);
  const [reportReady, setReportReady] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isPingingForData, setIsPingingForData] = useState(false);

  // Hook for fetching guest report data
  const { refetch: pingGuestReport } = useGuestReportData(currentGuestReportId, false);

  // Modal ping-back function - proactively fetch data when ready
  const startModalPingBack = useCallback(async () => {
    if (isPingingForData || reportReady || errorState) return;
    
    console.log('🎯 Report Ready! Starting modal ping-back to fetch data...');
    setIsPingingForData(true);

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total (2s interval)
    
    const checkForData = async () => {
      attempts++;
      console.log(`🔄 Modal ping-back attempt ${attempts}/${maxAttempts}`);
      
      try {
        const result = await pingGuestReport();
        
        if (result.error) {
          console.log('❌ Modal ping-back detected error:', result.error);
          if (attempts >= maxAttempts) {
            setErrorState('There was an issue generating your report. Please try again or contact support.');
            setIsPingingForData(false);
          } else {
            // Retry with exponential backoff
            const delay = Math.min(2000 * Math.pow(1.5, attempts - 1), 8000);
            setTimeout(checkForData, delay);
          }
        } else if (result.data) {
          console.log('✅ Modal ping-back: Report data found, opening modal');
          setReportReady(true);
          setIsPingingForData(false);
          if (onViewReport) {
            onViewReport(result.data);
          }
        } else if (attempts < maxAttempts) {
          // Data not ready yet, continue checking
          setTimeout(checkForData, 2000);
        } else {
          console.log('⚠️ Modal ping-back: Max attempts reached, no data available');
          setErrorState('Report is taking longer than expected. Please refresh the page or contact support.');
          setIsPingingForData(false);
        }
      } catch (error) {
        console.error('❌ Modal ping-back failed:', error);
        if (attempts >= maxAttempts) {
          setErrorState('Unable to check report status. Please refresh the page or contact support.');
          setIsPingingForData(false);
        } else {
          // Retry after delay
          setTimeout(checkForData, 2000);
        }
      }
    };

    // Start checking immediately
    checkForData();
  }, [isPingingForData, reportReady, errorState, pingGuestReport, onViewReport]);

  // Fail-safe function to check report status (original logic)
  const triggerFailSafe = useCallback(async () => {
    if (reportReady || errorState || isPingingForData) return;
    
    console.log('🚨 Fail-safe triggered: Pinging get-guest-report edge function');

    try {
      const result = await pingGuestReport();
      
      if (result.error) {
        console.log('❌ Fail-safe detected error:', result.error);
        setErrorState('There was an issue generating your report. Please try again or contact support.');
      } else if (result.data) {
        console.log('✅ Fail-safe: Report data found, opening modal');
        setReportReady(true);
        if (onViewReport) {
          onViewReport(result.data);
        }
      } else {
        // No data yet, show "Report Ready!" and start ping-back
        console.log('🎯 Fail-safe: No data yet, showing Report Ready and starting ping-back');
        setReportReady(true);
        startModalPingBack();
      }
    } catch (error) {
      console.error('❌ Fail-safe ping failed:', error);
      setErrorState('Unable to check report status. Please refresh the page or contact support.');
    }
  }, [reportReady, errorState, isPingingForData, pingGuestReport, onViewReport, startModalPingBack]);

  // Visual countdown timer with fail-safe trigger
  useEffect(() => {
    if (reportReady || errorState) return;

    const timer = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger fail-safe when countdown reaches 0
          triggerFailSafe();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reportReady, errorState, triggerFailSafe]);

  // Auto-start ping-back if we're already in "Report Ready!" state
  useEffect(() => {
    if (reportReady && !isPingingForData && !errorState && onViewReport) {
      startModalPingBack();
    }
  }, [reportReady, isPingingForData, errorState, onViewReport, startModalPingBack]);

  return (
    <div className={isMobile ? 'min-h-[calc(var(--vh,1vh)*100)] flex items-start justify-center pt-8 px-4 bg-gradient-to-b from-background to-muted/20 overflow-y-auto' : 'w-full py-10 px-4 flex justify-center'}>
      <div className={isMobile ? 'w-full max-w-md' : 'w-full max-w-4xl'}>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            {errorState ? (
              <>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">Something went wrong</h2>
                  <p className="text-gray-600 font-light">{errorState}</p>
                </div>
              </>
            ) : reportReady ? (
              <>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">Report Ready!</h2>
                  <p className="text-gray-600 font-light">
                    {isPingingForData ? 'Fetching your report...' : 'Opening your report...'}
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Simple countdown at top */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-light text-gray-900 mb-2">{countdownTime}s</div>
                  <p className="text-sm text-gray-600">Generating your report...</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  Hi {firstName}! Your report is being prepared.<br />
                  <span className="font-medium">{email}</span>
                </div>

                {/* Entertainment window during wait */}
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
