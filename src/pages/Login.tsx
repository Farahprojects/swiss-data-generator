import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import EmailInput from '@/components/auth/EmailInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLogin from '@/components/auth/SocialLogin';
import { validateEmail } from '@/utils/authValidation';
import { LoginVerificationModal } from '@/components/auth/LoginVerificationModal';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

import { supabase } from '@/integrations/supabase/client';

/**
 * Use the centralized Supabase client instead of hardcoded constants
 */

/**
 * Login page component
 * Handles email/password auth, password reset, and unverified‑email flows.
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ————————————————————————————————————————————————
  // Auth context
  // ————————————————————————————————————————————————
  const {
    signIn,
    signInWithGoogle,
    signInWithApple,
    user,
    loading: authLoading,
    pendingEmailAddress,
    isPendingEmailCheck,
    clearPendingEmail,
  } = useAuth();

  // ————————————————————————————————————————————————
  // Local UI state
  // ————————————————————————————————————————————————
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ————————————————————————————————————————————————
  // Redirect to calendar once fully authenticated
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (!authLoading && user && !showVerificationModal && !isPendingEmailCheck) {
      const from = (location.state as any)?.from?.pathname || '/chat';
      navigate(from, { replace: true });
    }
  }, [authLoading, user, showVerificationModal, isPendingEmailCheck, navigate, location.state]);

  // ————————————————————————————————————————————————
  // Show verification modal automatically when flagged by AuthContext
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (pendingEmailAddress && !isPendingEmailCheck) {
      setShowVerificationModal(true);
    }
  }, [pendingEmailAddress, isPendingEmailCheck]);

  // ————————————————————————————————————————————————
  // Show verification modal when redirected from a protected route
  // ————————————————————————————————————————————————
  useEffect(() => {
    const state = location.state as any;
    if (state?.showVerification && state?.pendingEmail) {
      setShowVerificationModal(true);
    }
  }, [location.state]);

  // ————————————————————————————————————————————————
  // If the user manually navigates to /login while already signed‑in, bounce them.
  // ————————————————————————————————————————————————
  if (
    user &&
    !loginAttempted &&
    !showVerificationModal &&
    !pendingEmailAddress &&
    !isPendingEmailCheck &&
    (typeof window === 'undefined' || !window.location.pathname.includes('/auth/password'))
  ) {
    const from = (location.state as any)?.from?.pathname || '/chat';
    return <Navigate to={from} replace />;
  }

  // ————————————————————————————————————————————————
  // Helpers
  // ————————————————————————————————————————————————
  const openVerificationModal = () => {
    setShowVerificationModal(true);
    setLoading(false);
  };

  /** Resend verification email (edge function) */
  const handleResendVerification = async (email: string): Promise<{ error: Error | null }> => {
    try {
      // Use Supabase edge function via the client
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: { user_id: user?.id ?? '' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send verification email');
      }

      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox (and spam folder).',
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message ?? 'Unable to resend email',
        variant: 'destructive',
      });
      
      return { error: error instanceof Error ? error : new Error(error.message ?? 'Unable to resend email') };
    }
  };

  // ————————————————————————————————————————————————
  // Form submit
  // ————————————————————————————————————————————————
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || loading) return;

    setLoginAttempted(true);
    setLoading(true);
    setErrorMsg('');

    try {
      // Step 1: try sign‑in
      const { data, error } = await signIn(email, password);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('confirm') || msg.includes('verification') || msg.includes('verify')) {
          openVerificationModal();
        } else {
          setErrorMsg('Invalid email or password');
        }
        return;
      }

      // Step 2: check email confirmed
      if (data?.user && !data.user.email_confirmed_at) {
        return openVerificationModal();
      }

      // Step 3: success — redirect immediately
      
      // Force immediate redirect after successful login
      const from = (location.state as any)?.from?.pathname || '/chat';
      navigate(from, { replace: true });
      
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoginAttempted(false);
    }
  };

  // ————————————————————————————————————————————————
  // OAuth helpers (disabled for now)
  // ————————————————————————————————————————————————
  const handleGoogleSignIn = async () => signInWithGoogle();
  const handleAppleSignIn = async () => signInWithApple();

  // ————————————————————————————————————————————————
  // Verification modal callbacks
  // ————————————————————————————————————————————————
  const handleVerificationFinished = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
    toast({ title: 'Email verified', description: 'Redirecting…' });
    const from = (location.state as any)?.from?.pathname || '/chat';
    navigate(from, { replace: true });
  };

  const handleVerificationCancelled = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
  };

  // ————————————————————————————————————————————————
  // Render
  // ————————————————————————————————————————————————
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-12">
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              {/* ——————————————————— Hero ——————————————————— */}
              <header className="text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
                  Welcome
                  <br />
                  <span className="italic font-medium">back</span>
                </h1>
                <p className="text-lg text-gray-600 font-light">Sign in to continue your journey</p>
              </header>

              {/* ——————————————————— Form ——————————————————— */}
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <EmailInput email={email} isValid={emailValid} onChange={setEmail} onFocus={() => setErrorMsg('')} />
                  <PasswordInput
                    password={password}
                    isValid={passwordValid}
                    showRequirements={false}
                    onChange={setPassword}
                    onFocus={() => setErrorMsg('')}
                  />
                </div>

                {errorMsg && <div className="text-red-600 text-sm text-center font-light">{errorMsg}</div>}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full py-6 text-lg font-light bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300"
                  disabled={!emailValid || !passwordValid || loading}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              {/* ——————————————————— Extras ——————————————————— */}
              <div className="text-center space-y-6">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-light border-b border-gray-300 hover:border-gray-600 pb-1"
                >
                  Forgot your password?
                </button>

                <SocialLogin onGoogleSignIn={handleGoogleSignIn} onAppleSignIn={handleAppleSignIn} />

                <p className="text-sm text-gray-600 font-light">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-gray-900 hover:text-gray-700 transition-colors border-b border-gray-300 hover:border-gray-600 pb-1"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

      {showVerificationModal && (
        <LoginVerificationModal
          isOpen={showVerificationModal}
          email={pendingEmailAddress || email}
          currentEmail={user?.email || ''}
          pendingEmail={pendingEmailAddress}
          resendVerificationEmail={handleResendVerification}
          onVerified={handleVerificationFinished}
          onCancel={handleVerificationCancelled}
        />
      )}
    </div>
  );
};

export default Login;
