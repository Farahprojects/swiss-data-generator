import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AuthPage = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) return;

    // If user is authenticated after email verification, redirect to chat
    if (user && session) {
      navigate('/chat', { replace: true });
      return;
    }

    // If not authenticated, show message and redirect to signup
    const timer = setTimeout(() => {
      navigate('/signup', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (user && session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Email Verified!</h1>
          <p className="text-muted-foreground mb-4">Redirecting you to the app...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-4">Please Complete Registration</h1>
        <p className="text-muted-foreground mb-6">
          To continue, please click the verification link in your email, then return here to complete your registration.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting you to the signup page in a moment...
        </p>
      </div>
    </div>
  );
};