import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReportFlowCheckerProps {
  guestId: string;
  name: string;
  email: string;
  onPaid: (paidData: { guestId: string; name: string; email: string }) => void;
  onReportReady: (readyData: { guestId: string; name: string; email: string }) => void;
  onProcessingStateChange: (isProcessing: boolean) => void;
}

export const ReportFlowChecker = ({ guestId, name, email, onPaid, onReportReady, onProcessingStateChange }: ReportFlowCheckerProps) => {
  const hasTriggeredGenerationRef = useRef(false);
  const [isProcessingReport, setIsProcessingReport] = useState(false);

  useEffect(() => {
    if (!guestId) return;

    // Check if report is already ready (hasReport flag)
    const checkExistingReport = async () => {
      const { data: existingSignal } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestId)
        .limit(1);
      
      if (existingSignal && existingSignal.length > 0) {
        console.log('[ReportFlowChecker] Report already ready, skipping polling');
        onReportReady({ guestId, name, email });
        return true;
      }
      return false;
    };

    let pollingInterval: NodeJS.Timeout | undefined;
    let reportPollingInterval: NodeJS.Timeout | undefined;

    const pollPaymentStatus = async () => {
      console.log('[ReportFlowChecker] Polling payment status for:', guestId);
      const { data, error } = await supabase.functions.invoke('get-payment-status', {
        body: { guest_id: guestId },
      });

      if (error) {
        console.error('[ReportFlowChecker] Polling error:', error);
        return;
      }
      
      if (data?.payment_status === 'paid') {
        if(pollingInterval) clearInterval(pollingInterval);
        
        if (!hasTriggeredGenerationRef.current) {
          hasTriggeredGenerationRef.current = true;
          console.log('[ReportFlowChecker] "Paid" status confirmed. Triggering report generation...');
          console.log('[ReportFlowChecker] Guest ID for persistence:', guestId);
          
          // Trigger report generation
          supabase.functions.invoke('trigger-report-generation', { body: { guest_report_id: guestId } });
          
          // Call onPaid but don't navigate yet
          onPaid({ guestId, name: data.name || name, email: data.email || email });
          
          // Start processing state and poll for report readiness
          setIsProcessingReport(true);
          onProcessingStateChange(true);
          
          // Start polling for report readiness every 3 seconds
          reportPollingInterval = setInterval(pollReportReadiness, 3000);
          pollReportReadiness(); // Check immediately
        }
      }
      else if (data?.payment_status === 'pending') {
        if(pollingInterval) clearInterval(pollingInterval);
        console.log('[ReportFlowChecker] "Pending" status confirmed. Creating payment session...');
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment-session', {
          body: { guest_report_id: guestId },
        });

        if (sessionError || !sessionData?.checkoutUrl) {
          console.error('Failed to create payment session:', sessionError);
          return;
        }
        window.location.href = sessionData.checkoutUrl;
      }
    };

    const pollReportReadiness = async () => {
      console.log('[ReportFlowChecker] Polling report readiness for:', guestId);
      
      const { data: reportSignal, error } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestId)
        .limit(1);

      if (error) {
        console.error('[ReportFlowChecker] Report polling error:', error);
        return;
      }

      if (reportSignal && reportSignal.length > 0) {
        console.log('[ReportFlowChecker] Report ready! Enabling chat navigation');
        if (reportPollingInterval) clearInterval(reportPollingInterval);
        
        setIsProcessingReport(false);
        onProcessingStateChange(false);
        onReportReady({ guestId, name, email });
      }
    };

    // Check if report already exists first
    checkExistingReport().then((hasExisting) => {
      if (!hasExisting) {
        // Start payment status polling
        pollPaymentStatus(); 
        pollingInterval = setInterval(pollPaymentStatus, 3000);
      }
    });

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (reportPollingInterval) clearInterval(reportPollingInterval);
    };

  }, [guestId, name, email, onPaid, onReportReady, onProcessingStateChange]);

  return null; 
};

export default ReportFlowChecker;
