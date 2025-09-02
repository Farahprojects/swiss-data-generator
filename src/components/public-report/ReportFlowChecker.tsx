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

    // Check if report already exists first
    checkExistingReport().then((hasExisting) => {
      if (!hasExisting) {
        // Don't start automatic polling - only check when explicitly triggered
        console.log('[ReportFlowChecker] Report not ready, waiting for explicit payment check');
      }
    });

  }, [guestId, name, email, onPaid, onReportReady, onProcessingStateChange]);

  // Function to check payment status when user has paid or pressed "Proceed to Payment"
  const checkPaymentStatus = async () => {
    if (!guestId || hasTriggeredGenerationRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-payment-status', {
        body: { guest_id: guestId },
      });

      if (error) {
        console.error('[ReportFlowChecker] Payment status check error:', error);
        return;
      }
      
      if (data?.payment_status === 'paid') {
        if (!hasTriggeredGenerationRef.current) {
          hasTriggeredGenerationRef.current = true;
          
          console.log('[ReportFlowChecker] Payment confirmed, triggering report generation');
          
          // Trigger report generation
          const { error: triggerError } = await supabase.functions.invoke('trigger-report-generation', { 
            body: { guest_report_id: guestId } 
          });

          if (triggerError) {
            console.error('[ReportFlowChecker] Failed to trigger report generation:', triggerError);
            return;
          }

          console.log('[ReportFlowChecker] Report generation triggered successfully');
          
          // Navigate directly to chat - let chat page handle report readiness polling
          onPaid({ guestId, name: data.name || name, email: data.email || email });
        }
      }
      else if (data?.payment_status === 'pending') {
        console.log('[ReportFlowChecker] Payment still pending, creating checkout session');
        
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment-session', {
          body: { guest_report_id: guestId },
        });

        if (sessionError || !sessionData?.checkoutUrl) {
          console.error('Failed to create payment session:', sessionError);
          return;
        }
        
        console.log('[ReportFlowChecker] Redirecting to checkout');
        window.location.href = sessionData.checkoutUrl;
      }
      else {
        console.log('[ReportFlowChecker] Payment status:', data?.payment_status);
      }
    } catch (error) {
      console.error('[ReportFlowChecker] Unexpected error checking payment status:', error);
    }
  };

  // Expose the check function so parent components can call it
  useEffect(() => {
    // Make the checkPaymentStatus function available to parent components
    (window as any).checkPaymentStatus = checkPaymentStatus;
    
    return () => {
      delete (window as any).checkPaymentStatus;
    };
  }, [guestId]);

  return null; 
};

export default ReportFlowChecker;
