import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const StripeReturn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const guestId = searchParams.get('guest_id');
    const paymentStatus = searchParams.get('payment_status');

    if (guestId) {
      // Redirect to guest chat route with payment status
      const redirectUrl = `/c/g/${guestId}${paymentStatus ? `?payment_status=${paymentStatus}` : ''}`;
      console.log(`[StripeReturn] Redirecting to: ${redirectUrl}`);
      navigate(redirectUrl, { replace: true });
    } else {
      // No guest_id, redirect to main chat
      console.log('[StripeReturn] No guest_id found, redirecting to /c');
      navigate('/c', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};

export default StripeReturn;
