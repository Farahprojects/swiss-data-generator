
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { getGuestToken } from '@/utils/urlHelpers';
import { useReportOrchestrator } from '@/hooks/useReportOrchestrator';
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
  const { setupOrchestratorListener } = useReportOrchestrator();

  // Simple visual countdown (24 seconds for UX)
  const [countdownTime, setCountdownTime] = useState(24);
  const [reportReady, setReportReady] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [failSafeTriggered, setFailSafeTriggered] = useState(false);

  // Fail-safe ping function
  const { refetch: pingGuestReport } = useGuestReportData(currentGuestReportId, false);

  // Handle report ready from orchestrator
  const handleReportReady = useCallback((reportData: ReportData) => {
    console.log('🎯 Report ready signal received from orchestrator');
    setReportReady(true);
    setCountdownTime(0);
    
    // Open modal with orchestrator-provided data
    if (onViewReport) {
      onViewReport(reportData);
    }
  }, [onViewReport]);

  // Fail-safe function to check report status
  const triggerFailSafe = useCallback(async () => {
    if (failSafeTriggered || reportReady) return;
    
    console.log('🚨 Fail-safe triggered: Pinging get-guest-report edge function');
    setFailSafeTriggered(true);

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
      }
    } catch (error) {
      console.error('❌ Fail-safe ping failed:', error);
      setErrorState('Unable to check report status. Please refresh the page or contact support.');
    }
  }, [failSafeTriggered, reportReady, pingGuestReport, onViewReport]);

  // Set up orchestrator listener on mount
  useEffect(() => {
    if (currentGuestReportId) {
      const cleanup = setupOrchestratorListener(currentGuestReportId, handleReportReady);
      return cleanup;
    }
  }, [currentGuestReportId, setupOrchestratorListener, handleReportReady]);

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
                  <p className="text-gray-600 font-light">Opening your report...</p>
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
