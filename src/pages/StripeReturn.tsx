import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function StripeReturn() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const guestId = params.get('guest_id');
    
    if (guestId) {
      navigate(`/report?guest_id=${guestId}`, { replace: true });
    } else {
      navigate(`/`, { replace: true }); // fallback
    }
  }, [search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">Verifying your payment...</p>
      </div>
    </div>
  );
}