import { useState } from 'react';
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

// ──────────────────────────────────────────
// env / constants
// ──────────────────────────────────────────
const SUPABASE_URL = 'https://wrvqqvqvwqmfdqvqmaar.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0';

// ──────────────────────────────────────────
// component
// ──────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signInWithGoogle, signInWithApple, user } = useAuth();
  const { resendVerificationEmail } = useEmailChange();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingEmailAddress, setPendingEmailAddress] = useState<
    string | undefined
  >(undefined);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ── Redirect only if there is NO modal / pending state
  if (user && !(showVerificationModal || pendingEmailAddress)) {
    const isPasswordResetRoute =
      window.location.pathname.includes('/auth/password');

    if (!isPasswordResetRoute) {
      const from = (location.state as any)?.from?.pathname || '/';
      return <Navigate to={from} replace />;
    }
  }

  const openVerificationModal = (pendingTo?: string) => {
    setPendingEmailAddress(pendingTo);
    setShowVerificationModal(true);
    setLoading(false);
  };

  /**
   * POST /functions/v1/email-check
   * Needs:  Authorization: Bearer <session_token>
   */
  const checkForPendingEmailChange = async (
    sessionToken: string,
    userEmail: string,
  ) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/email-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      logToSupabase('email-check failed', {
        level: 'warn',
        page: 'Login',
        data: { error: err instanceof Error ? err.message : String(err) },
      });
      return null;
    }
  };

  // ──────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // STEP 1: password validation
      const {
        data: { user: authedUser, session },
        error,
      } = await signIn(email, password);

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('confirm') ||
          msg.includes('verification') ||
          msg.includes('verify')
        ) {
          return openVerificationModal();
        }

        setErrorMsg('Invalid email or password');
        return setLoading(false);
      }

      // STEP 2: email not confirmed
      if (authedUser && !authedUser.email_confirmed_at) {
        return openVerificationModal();
      }

      // STEP 3: pending email change?
      const emailCheckData = await checkForPendingEmailChange(
        session!.access_token,
        email,
      );

      if (emailCheckData?.status === 'pending') {
        return openVerificationModal(emailCheckData.pending_to);
      }

      // STEP 4: good to go
      navigate((location.state as any)?.from?.pathname || '/', {
        replace: true,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to sign in',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // OAuth helpers (unchanged)
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
    setPendingEmailAddress(undefined);
    toast({
      title: 'Email verified!',
      description: 'You can now continue to your dashboard.',
    });
    navigate((location.state as any)?.from?.pathname || '/', { replace: true });
  };

  // ──────────────────────────────────────────
  // render
  // ──────────────────────────────────────────
  return (
    <div className='flex flex-col min-h-screen'>
      <UnifiedNavigation />

      <main className='flex-grow flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md space-y-8'>
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              <header className='text-center'>
                <h1 className='text-3xl font-bold'>Welcome back</h1>
                <p className='mt-2 text-gray-600'>Sign in to your account</p>
              </header>

              <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='space-y-4'>
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

                  <div className='flex justify-between items-center'>
                    <button
                      type='button'
                      onClick={() => setShowForgotPassword(true)}
                      className='text-sm text-primary hover:underline'
                    >
                      Forgot password?
                    </button>

                    <Link
                      to='/signup'
                      className='text-sm text-primary hover:underline'
                    >
                      Don&apos;t have an account? Sign up
                    </Link>
                  </div>
                </div>

                {errorMsg && (
                  <p className='text-center text-sm font-medium text-red-600 -mt-2'>
                    {errorMsg}
                  </p>
                )}

                <Button
                  type='submit'
                  className='w-full'
                  disabled={loading || !emailValid || !passwordValid}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>

                <SocialLogin
                  onGoogleSignIn={handleGoogleSignIn}
                  onAppleSignIn={handleAppleSignIn}
                />
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />

      <LoginVerificationModal
        isOpen={showVerificationModal}
        email={email}
        pendingEmail={pendingEmailAddress}
        onVerified={handleVerificationFinished}
        onCancel={() => {
          setShowVerificationModal(false);
          setPendingEmailAddress(undefined);
        }}
        resend={resendVerificationEmail}
      />
    </div>
  );
};

export default Login;
