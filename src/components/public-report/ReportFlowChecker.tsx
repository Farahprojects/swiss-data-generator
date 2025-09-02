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
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    if (!guestId) {
      console.log('[ReportFlowChecker] No guest_id available, waiting...');
      return;
    }

    console.log(`[ReportFlowChecker] 🚀 Starting flow checker for guest_id: ${guestId}`);

    // Check if report is already ready (hasReport flag)
    const checkExistingReport = async () => {
      console.log(`[ReportFlowChecker] 🔍 Checking if report already exists for: ${guestId}`);
      
      const { data: existingSignal } = await supabase
        .from('report_ready_signals')
        .select('guest_report_id')
        .eq('guest_report_id', guestId)
        .limit(1);
      
      if (existingSignal && existingSignal.length > 0) {
        console.log(`[ReportFlowChecker] ✅ Report already exists for: ${guestId}`);
        onReportReady({ guestId, name, email });
        return true;
      }
      
      console.log(`[ReportFlowChecker] 📝 No existing report found for: ${guestId}, starting payment polling`);
      return false;
    };

    let pollingInterval: NodeJS.Timeout | undefined;

    const pollPaymentStatus = async () => {
      if (!guestId || hasTriggeredGenerationRef.current) return;

      try {
        console.log(`[ReportFlowChecker] 🔄 Polling payment status for: ${guestId}`);
        
        const { data, error } = await supabase.functions.invoke('get-payment-status', {
          body: { guest_id: guestId },
        });

        if (error) {
          console.error(`[ReportFlowChecker] ❌ Payment status check error for ${guestId}:`, error);
          return;
        }
        
        console.log(`[ReportFlowChecker] 📊 Payment status for ${guestId}:`, data?.payment_status);
        
        if (data?.payment_status === 'paid') {
          if (!hasTriggeredGenerationRef.current) {
            hasTriggeredGenerationRef.current = true;
            
            console.log(`[ReportFlowChecker] 💰 Payment confirmed for ${guestId}, triggering report generation`);
            
            // Trigger report generation
            const { error: triggerError } = await supabase.functions.invoke('trigger-report-generation', { 
              body: { guest_report_id: guestId } 
            });

            if (triggerError) {
              console.error(`[ReportFlowChecker] ❌ Failed to trigger report generation for ${guestId}:`, triggerError);
              return;
            }

            console.log(`[ReportFlowChecker] ✅ Report generation triggered successfully for ${guestId}`);
            
            // Stop polling
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingActive(false);
            }
            
            // Navigate directly to chat - let chat page handle report readiness polling
            onPaid({ guestId, name: data.name || name, email: data.email || email });
          }
        }
        else if (data?.payment_status === 'pending') {
          console.log(`[ReportFlowChecker] ⏳ Payment still pending for ${guestId}, creating checkout session`);
          
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment-session', {
            body: { guest_report_id: guestId },
          });

          if (sessionError || !sessionData?.checkoutUrl) {
            console.error(`[ReportFlowChecker] ❌ Failed to create checkout session for ${guestId}:`, sessionError);
            return;
          }
          
          console.log(`[ReportFlowChecker] 🔗 Redirecting ${guestId} to checkout:`, sessionData.checkoutUrl);
          
          // Stop polling before redirect
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingActive(false);
          }
          
          window.location.href = sessionData.checkoutUrl;
        }
        else {
          console.log(`[ReportFlowChecker] ℹ️ Payment status for ${guestId}: ${data?.payment_status}`);
        }
      } catch (error) {
        console.error(`[ReportFlowChecker] ❌ Unexpected error checking payment status for ${guestId}:`, error);
      }
    };

    // Check if report already exists first
    checkExistingReport().then((hasExisting) => {
      if (!hasExisting) {
        console.log(`[ReportFlowChecker] 🚀 Starting payment polling for ${guestId} - polling every 1 second`);
        
        // Start polling every 1 second
        setPollingActive(true);
        pollPaymentStatus(); // Initial check
        pollingInterval = setInterval(pollPaymentStatus, 1000); // Poll every 1 second
      }
    });

    return () => {
      if (pollingInterval) {
        console.log(`[ReportFlowChecker] 🛑 Stopping polling for ${guestId}`);
        clearInterval(pollingInterval);
        setPollingActive(false);
      }
    };

  }, [guestId, name, email, onPaid, onReportReady, onProcessingStateChange]);

  // Log polling status changes
  useEffect(() => {
    if (pollingActive) {
      console.log(`[ReportFlowChecker] 🔄 Polling ACTIVE for ${guestId}`);
    } else {
      console.log(`[ReportFlowChecker] ⏸️ Polling STOPPED for ${guestId}`);
    }
  }, [pollingActive, guestId]);

  return null; 
};

export default ReportFlowChecker;
