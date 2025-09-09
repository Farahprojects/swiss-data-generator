import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function StripeReturn() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    console.log('🔍 [StripeReturn] Component mounted');
    console.log('🔍 [StripeReturn] Full URL:', window.location.href);
    console.log('🔍 [StripeReturn] Search params:', search);
    
    const params = new URLSearchParams(search);
    const guestId = params.get('guest_id');
    const sessionId = params.get('session_id');
    const status = params.get('status');
    
    console.log('🔍 [StripeReturn] Parsed params:', { guestId, sessionId, status });
    
    if (guestId) {
      console.log('✅ [StripeReturn] Found guest_id, navigating to chat page');
      // Navigate to chat with guest_id and payment_completed flag
      navigate(`/chat?guest_id=${guestId}&payment_completed=true`, { replace: true });
    } else if (sessionId) {
      console.log('✅ [StripeReturn] Found session_id, navigating to report page');
      const reportUrl = status 
        ? `/chat?session_id=${sessionId}&status=${status}`
        : `/chat?session_id=${sessionId}`;
      navigate(reportUrl, { replace: true });
    } else {
      console.log('⚠️ [StripeReturn] No guest_id or session_id found, navigating to home');
      navigate(`/`, { replace: true }); // fallback
    }
  }, [search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">Verifying your payment...</p>
        <p className="text-sm text-muted-foreground mt-2">Redirecting you back to your report...</p>
      </div>
    </div>
  );
}