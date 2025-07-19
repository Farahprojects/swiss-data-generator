
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { getGuestToken } from '@/utils/urlHelpers';
import { useReportOrchestrator } from '@/hooks/useReportOrchestrator';
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

  // Set up orchestrator listener on mount
  useEffect(() => {
    if (currentGuestReportId) {
      const cleanup = setupOrchestratorListener(currentGuestReportId, handleReportReady);
      return cleanup;
    }
  }, [currentGuestReportId, setupOrchestratorListener, handleReportReady]);

  // Visual countdown timer (just for UX)
  useEffect(() => {
    if (reportReady) return;

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
  }, [reportReady]);


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
