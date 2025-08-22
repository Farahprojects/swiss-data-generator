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
        onReportReady({ guestId, name, email });
        return true;
      }
      return false;
    };

    let pollingInterval: NodeJS.Timeout | undefined;

    const pollPaymentStatus = async () => {
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
          
          // Trigger report generation
          supabase.functions.invoke('trigger-report-generation', { body: { guest_report_id: guestId } });
          
          // Navigate directly to chat - let chat page handle report readiness polling
          onPaid({ guestId, name: data.name || name, email: data.email || email });
        }
      }
      else if (data?.payment_status === 'pending') {
        if(pollingInterval) clearInterval(pollingInterval);
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

    // Report readiness polling removed - chat page handles this

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
    };

  }, [guestId, name, email, onPaid, onReportReady, onProcessingStateChange]);

  return null; 
};

export default ReportFlowChecker;
