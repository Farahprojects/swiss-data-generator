import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReportFlowCheckerProps {
  guestId: string;
  name: string;
  email: string;
  onPaid: (paidData: { guestId: string; name: string; email: string }) => void;
}

export const ReportFlowChecker = ({ guestId, name, email, onPaid }: ReportFlowCheckerProps) => {
  const hasTriggeredGenerationRef = useRef(false);

  useEffect(() => {
    if (!guestId) return;

    let pollingInterval: NodeJS.Timeout | undefined;

    const poll = async () => {
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
          supabase.functions.invoke('trigger-report-generation', { body: { guest_report_id: guestId } });
          onPaid({ guestId, name: data.name || name, email: data.email || email });
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

    poll(); 
    pollingInterval = setInterval(poll, 3000); 

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };

  }, [guestId, name, email, onPaid]);

  return null; 
};

export default ReportFlowChecker;
