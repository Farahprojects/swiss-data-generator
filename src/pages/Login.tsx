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
import { supabase } from '@/integrations/supabase/client';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { logToSupabase } from '@/utils/batchedLogManager';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { 
    signIn, 
    signInWithGoogle, 
    signInWithApple, 
    user, 
    pendingEmailAddress, 
    isPendingEmailCheck,
    clearPendingEmail 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // Check if we need to show verification modal based on AuthContext state
  useEffect(() => {
    if (pendingEmailAddress && !isPendingEmailCheck) {
      setShowVerificationModal(true);
      logToSupabase('Showing verification modal from AuthContext state', {
        level: 'info',
        page: 'Login',
        data: { pendingTo: pendingEmailAddress }
      });
    }
  }, [pendingEmailAddress, isPendingEmailCheck]);

  // Check for state passed from AuthGuard
  useEffect(() => {
    const state = location.state as any;
    if (state?.showVerification && state?.pendingEmail) {
      setShowVerificationModal(true);
      logToSupabase('Showing verification modal from location state', {
        level: 'info',
        page: 'Login',
        data: { pendingEmail: state.pendingEmail }
      });
    }
  }, [location.state]);

  // Redirect user ONLY when arriving on /login while already authenticated and no pending verification
  if (
    user &&
    !loginAttempted &&
    !showVerificationModal &&
    !pendingEmailAddress &&
    !isPendingEmailCheck &&
    (typeof window === 'undefined' || !window.location.pathname.includes('/auth/password'))
  ) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const openVerificationModal = () => {
    setShowVerificationModal(true);
    setLoading(false);
  };

  // Updated resend verification function to send only user_id
  const handleResendVerification = async (emailToVerify: string) => {
    try {
      logToSupabase("Resending login verification email", {
        level: 'info',
        page: 'Login',
        data: { emailToVerify, userEmail: user?.email, userId: user?.id }
      });

      const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

      const response = await fetch(`${SUPABASE_URL}/functions/v1/email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          user_id: user?.id || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to resend verification (${response.status})`);
      }

      logToSupabase("Login verification email resent successfully", {
        level: 'info',
        page: 'Login'
      });

      return { error: null };
    } catch (error: any) {
      logToSupabase("Exception resending login verification", {
        level: 'error',
        page: 'Login',
        data: { error: error.message || String(error) }
      });
      return { error: error as Error };
    }
  };

  // ──────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || loading) return;

    setLoginAttempted(true);
    setLoading(true);
    setErrorMsg('');

    try {
      // STEP 1: password validation
      const { data, error } = await signIn(email, password);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('confirm') || msg.includes('verification') || msg.includes('verify')) {
          openVerificationModal();
        } else {
          setErrorMsg('Invalid email or password');
        }
        return setLoading(false);
      }

      const authedUser = data?.user;

      // STEP 2: email not confirmed
      if (authedUser && !authedUser.email_confirmed_at) {
        return openVerificationModal();
      }

      // STEP 3: Successful login - navigate to dashboard
      logToSupabase('Login successful, navigating to dashboard', {
        level: 'info',
        page: 'Login'
      });
      
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });

    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to sign in',
        variant: 'destructive',
      });
      setLoading(false);
    } finally {
      setLoginAttempted(false);
    }
  };

  // ──────────────────────────────────────────
  // OAuth helpers
  // ──────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    // Disabled for now
    return;
  };

  const handleAppleSignIn = async () => {
    // Disabled for now
    return;
  };

  const handleVerificationFinished = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
    toast({
      title: 'Email verified!',
      description: 'You can now continue to your dashboard.',
    });
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  const handleVerificationCancelled = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
  };

  // ──────────────────────────────────────────
  // render
  // ──────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-12">
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              <header className="text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-light text-white leading-tight">
                  Welcome
                  <br />
                  <span className="italic font-medium">back</span>
                </h1>
                <p className="text-lg text-gray-400 font-light">
                  Sign in to continue your journey
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <EmailInput
                    email={email}
                    isValid={emailValid}
                    onChange={setEmail}
                    onFocus={() => setErrorMsg('')}
                  />
                  <PasswordInput
                    password={password}
                    isValid={passwordValid}
                    showRequirements={false}
                    onChange={setPassword}
                    onFocus={() => setErrorMsg('')}
                  />
                </div>

                {errorMsg && (
                  <div className="text-red-400 text-sm text-center font-light">{errorMsg}</div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  variant="outline"
                  className="w-full py-6 text-lg font-light border-white text-white hover:bg-white hover:text-black transition-all duration-300"
                  disabled={!emailValid || !passwordValid || loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="text-center space-y-6">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-400 hover:text-white transition-colors font-light border-b border-gray-600 hover:border-white pb-1"
                >
                  Forgot your password?
                </button>

                <SocialLogin
                  onGoogleSignIn={handleGoogleSignIn}
                  onAppleSignIn={handleAppleSignIn}
                />

                <p className="text-sm text-gray-400 font-light">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-white hover:text-gray-300 transition-colors border-b border-gray-600 hover:border-white pb-1">
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
