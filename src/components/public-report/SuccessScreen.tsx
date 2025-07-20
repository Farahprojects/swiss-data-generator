
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportData } from '@/utils/reportContentExtraction';
import { supabase } from '@/integrations/supabase/client';
import EntertainmentWindow from './EntertainmentWindow';

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

  // Handle report ready from orchestrator (via parent component)
  const handleReportReady = useCallback((reportData: ReportData) => {
    console.log('🎯 Report ready signal received from orchestrator');
    setReportReady(true);
    setCountdownTime(0);
    
    // Open modal with orchestrator-provided data
    if (onViewReport) {
      onViewReport(reportData);
    }
  }, [onViewReport]);

  // Register callback with parent component for orchestrator to use
  useEffect(() => {
    if (onReportReady) {
      onReportReady(handleReportReady);
    }
  }, [onReportReady, handleReportReady]);

  // Simple orchestrator fallback for post-refresh scenarios (no polling)
  useEffect(() => {
    if (!guestReportId || reportReady) return;

    const checkOrchestratorReady = async () => {
      try {
        console.log('🔄 Post-refresh orchestrator check for:', guestReportId);
        
        const { data, error } = await supabase.functions.invoke('orchestrate-report-ready', {
          body: { guest_report_id: guestReportId }
        });

        if (!error && data?.success && data?.report_data) {
          console.log('✅ Post-refresh report found ready - opening modal');
          handleReportReady(data.report_data);
        } else {
          console.log('⏳ Post-refresh check: report not ready yet, continuing countdown');
        }
      } catch (error) {
        console.log('🔍 Post-refresh orchestrator check failed, continuing countdown:', error);
      }
    };

    // Small delay to let normal orchestrator listener attempt first
    const timeout = setTimeout(checkOrchestratorReady, 1000);
    return () => clearTimeout(timeout);
  }, [guestReportId, reportReady, handleReportReady]);

  // Pure visual countdown timer (no polling trigger)
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
