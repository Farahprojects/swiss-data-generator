import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReportFlowCheckerProps {
  guestId: string;
  onPaid: (guestId: string) => void;
}

const ReportFlowChecker = ({ guestId, onPaid }: ReportFlowCheckerProps) => {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[ReportFlowChecker] Received guestId: ${guestId}`);
    if (!guestId) return;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-payment-status', {
          body: { guest_id: guestId },
        });

        if (error) throw error;

        setStatus(data.payment_status);

        if (data.payment_status === 'paid') {
          onPaid(guestId);
        } else if (data.payment_status === 'pending') {
          // If pending, create a checkout session and redirect
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment-session', {
            body: { guest_id: guestId },
          });

          if (sessionError) throw sessionError;
          
          if (sessionData.checkoutUrl) {
            window.location.href = sessionData.checkoutUrl;
          }
        }
      } catch (error) {
        console.error('Error in payment flow checker:', error);
      }
    };

    poll();
    
    // Simple polling for demonstration. In a real app, this would be more robust.
    const interval = setInterval(() => {
        if(status !== 'paid') {
            poll();
        }
    }, 5000);

    return () => clearInterval(interval);
  }, [guestId, onPaid, status]);

  return null; // This component does not render anything itself
};

export default ReportFlowChecker;
