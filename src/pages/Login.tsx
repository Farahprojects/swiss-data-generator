
import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import EmailInput from '@/components/auth/EmailInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLogin from '@/components/auth/SocialLogin';
import { validateEmail } from '@/utils/authValidation';
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal';
import { supabase } from '@/integrations/supabase/client';

/** Dev‑only logger */
const debug = (...a: any[]) => process.env.NODE_ENV !== 'production' && console.log('[Login]', ...a);

// Import the hardcoded URL directly from where it's defined
const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signInWithGoogle, resendVerificationEmail, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ───────────────── Redirect if already signed‑in
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const openVerificationModal = () => {
    setShowVerificationModal(true);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // Use the hardcoded SUPABASE_URL instead of import.meta.env.VITE_SUPABASE_URL
      const emailCheckRes = await fetch(`${SUPABASE_URL}/functions/email-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      console.log("Email check response status:", emailCheckRes.status);
      
      let emailCheckData;
      try {
        emailCheckData = await emailCheckRes.json();
        console.log("Email check data:", emailCheckData);
      } catch (err) {
        console.error("Failed to parse email-check response:", err);
        // Continue with sign-in even if email check fails
      }
      
      // If there's a pending email change, show the verification modal
      if (emailCheckData && emailCheckData.status === 'pending') {
        debug('Pending email change found, showing verification modal');
        return openVerificationModal();
      }

      debug('No pending email change, proceeding with sign in');
      
      // No pending change, proceed with normal sign-in
      const { data, error } = await signIn(email, password);

      if (error) {
        debug('signIn error', error);

        // Supabase masks unverified e‑mails with 400 / "Invalid login credentials".
        // We treat ANY 400 as potentially unverified and display the modal.
        const status = (error as any).status ?? (error as any).statusCode;
        if (status === 400) return openVerificationModal();

        // If status not present fallback to message heuristics
        if (error.message.toLowerCase().includes('confirm') || error.message.toLowerCase().includes('verification'))
          return openVerificationModal();

        setErrorMsg('Invalid email or password');
        return setLoading(false);
      }

      // Extra guard: data.user present but not confirmed (edge‑case when GoTrue behaviour changes)
      if (data?.user && !data.user.email_confirmed_at) return openVerificationModal();

      navigate((location.state as any)?.from?.pathname || '/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to sign in', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  /* Callback from modal when user verified */
  const handleVerificationFinished = async () => {
    setShowVerificationModal(false);
    toast({ title: 'Email verified!', description: 'You can now sign in.' });

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg('Login failed after verification. Please try again.');
      } else {
        navigate((location.state as any)?.from?.pathname || '/', { replace: true });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Login retry failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <EmailInput email={email} isValid={emailValid} onChange={setEmail} onFocus={() => setErrorMsg('')} />
              <PasswordInput
                password={password}
                isValid={passwordValid}
                showRequirements={false}
                onChange={setPassword}
                onFocus={() => setErrorMsg('')}
              />
            </div>

            {errorMsg && <p className="text-center text-sm font-medium text-red-600 -mt-2">{errorMsg}</p>}

            <Button type="submit" className="w-full" disabled={loading || !emailValid || !passwordValid}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <SocialLogin onGoogleSignIn={handleGoogleSignIn} />

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </main>

      <Footer />

      <EmailVerificationModal
        isOpen={showVerificationModal}
        email={email}
        resend={resendVerificationEmail}
        onVerified={handleVerificationFinished}
        onCancel={() => setShowVerificationModal(false)}
      />
    </div>
  );
};

export default Login;
