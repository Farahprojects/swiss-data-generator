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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ————————————————————————————————————————————————
  // Redirect to calendar once fully authenticated
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (!authLoading && user && !isPendingEmailCheck) {
      const from = (location.state as any)?.from?.pathname || '/chat';
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isPendingEmailCheck, navigate, location.state]);


  // ————————————————————————————————————————————————
  // If the user manually navigates to /login while already signed‑in, bounce them.
  // ————————————————————————————————————————————————
  if (
    user &&
    !loginAttempted &&
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
          setErrorMsg('Please check your email for verification instructions');
        } else {
          setErrorMsg('Invalid email or password');
        }
        return;
      }

      // Step 2: check email confirmed
      if (data?.user && !data.user.email_confirmed_at) {
        return openVerificationModal();
      }

      // Step 3: success — redirect immediately with user_id
      
      // Force immediate redirect after successful login with user_id parameter
      const from = (location.state as any)?.from?.pathname || '/chat';
      const basePath = from.includes('?') ? from.split('?')[0] : from;
      navigate(`${basePath}?user_id=${data.user.id}`, { replace: true });
      
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
  // Render
  // ————————————————————————————————————————————————
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto space-y-12">
          {showForgotPassword ? (
            <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
          ) : (
            <>
              {/* ——————————————————— Hero ——————————————————— */}
              <header className="text-center space-y-4 pt-8">
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
                  className="w-full py-6 text-lg font-light bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300 rounded-full"
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

      <Footer hideMobileAstroToggle />

    </div>
  );
};

export default Login;
