import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReportFlowCheckerProps {
  guestId: string;
  name?: string;
  email?: string;
  onPaid: (paidData: { guestId: string; name: string; email: string }) => void;
}

export const ReportFlowChecker = ({ guestId, onPaid, name, email }: ReportFlowCheckerProps) => {
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
          onPaid({ 
            guestId, 
            name: data.name || name, 
            email: data.email || email 
          });
        }
        // No need to handle 'pending' status here anymore, as the redirect happens before the checker is even mounted.
      } catch (error) {
        console.error('Error in payment flow checker:', error);
      }
    };

    poll();
    
    // Simple polling for demonstration. In a real app, this would be more robust.
    const intervalId = setInterval(() => {
        if(status !== 'paid') {
            poll();
        }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [guestId, onPaid, status, name, email]);

  return null; // This component does not render anything itself
};

export default ReportFlowChecker;
