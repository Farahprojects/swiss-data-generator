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
import { useEmailChange } from '@/hooks/useEmailChange';

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
  const { resendVerificationEmail } = useEmailChange();

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
    !window.location.pathname.includes('/auth/password')
  ) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const openVerificationModal = () => {
    setShowVerificationModal(true);
    setLoading(false);
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

      // STEP 3: The AuthContext will handle pending email checks via onAuthStateChange
      // If there's a pending email change, the AuthGuard will redirect back here
      // with the verification modal shown

      logToSupabase('Login successful, waiting for AuthContext to handle navigation', {
        level: 'info',
        page: 'Login'
      });

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
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to sign in with Apple',
        variant: 'destructive',
      });
    }
  };

  const handleVerificationFinished = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
    toast({
      title: 'Email verified!',
      description: 'You can now continue to your dashboard.',
    });
    navigate((location.state as any)?.from?.pathname || '/', { replace: true });
  };

  const handleVerificationCancelled = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
  };

  // ──────────────────────────────────────────
  // render
  // ──────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              <header className="text-center">
                <h1 className="text-3xl font-bold">Welcome back</h1>
                <p className="mt-2 text-gray-600">Sign in to your account</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
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
                  <div className="text-red-600 text-sm text-center">{errorMsg}</div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!emailValid || !passwordValid || loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="text-center space-y-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </button>

                <SocialLogin
                  onGoogleSignIn={handleGoogleSignIn}
                  onAppleSignIn={handleAppleSignIn}
                />

                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-blue-600 hover:text-blue-500">
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
          email={email || pendingEmailAddress || ''}
          pendingEmail={pendingEmailAddress}
          resendVerificationEmail={resendVerificationEmail}
          onVerified={handleVerificationFinished}
          onCancel={handleVerificationCancelled}
        />
      )}
    </div>
  );
};

export default Login;
