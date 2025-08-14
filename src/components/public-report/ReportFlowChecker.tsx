import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReportFlowCheckerProps {
  guestId: string;
  paymentStatus: 'paid' | 'pending';
  name: string;
  email: string;
  onPaid: (paidData: { guestId: string; name: string; email: string }) => void;
}

export const ReportFlowChecker = ({ guestId, paymentStatus, name, email, onPaid }: ReportFlowCheckerProps) => {

  useEffect(() => {
    if (!guestId) return;

    const handleFlow = async () => {
      // Flow for paid reports (e.g. promo/free)
      if (paymentStatus === 'paid') {
        console.log('[ReportFlowChecker] "Paid" status detected. Triggering report generation...');
        // Fire-and-forget the report generation
        supabase.functions.invoke('trigger-report-generation', { body: { guest_report_id: guestId } });
        // Immediately move to the success screen
        onPaid({ guestId, name, email });
        return;
      }

      // Flow for pending payments
      if (paymentStatus === 'pending') {
        console.log('[ReportFlowChecker] "Pending" status detected. Creating payment session...');
        const { data, error } = await supabase.functions.invoke('create-payment-session', {
          body: { guest_report_id: guestId },
        });

        if (error || !data?.checkoutUrl) {
          console.error('Failed to create payment session:', error);
          // Handle error appropriately, e.g. show an error message
          return;
        }
        // Redirect to Stripe
        window.location.href = data.checkoutUrl;
        return;
      }
      
      // Flow for Stripe returns (no initial paymentStatus prop)
      // This is the original polling logic.
      const poll = async () => {
        const { data, error } = await supabase.functions.invoke('get-payment-status', {
          body: { guest_id: guestId },
        });

        if (error) {
          console.error('[ReportFlowChecker] Polling error:', error);
          return;
        }

        if (data?.payment_status === 'paid') {
          console.log('[ReportFlowChecker] Payment confirmed via polling!', data);
          onPaid({ 
            guestId, 
            name: data.name || name, 
            email: data.email || email 
          });
        }
      };

      const intervalId = setInterval(poll, 2000);
      return () => clearInterval(intervalId);
    };

    handleFlow();

  }, [guestId, paymentStatus, name, email, onPaid]);

  return null; // This component does not render anything itself
};

export default ReportFlowChecker;
