
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
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal';
import { supabase } from '@/integrations/supabase/client';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

/** Dev‑only logger */
const debug = (...a: any[]) => process.env.NODE_ENV !== 'production' && console.log('[Login]', ...a);

// Import the hardcoded URL directly from where it's defined
const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
      console.log(`Calling edge function: ${SUPABASE_URL}/functions/v1/email-check`);
      const emailCheckRes = await fetch(`${SUPABASE_URL}/functions/v1/email-check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
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
      
      // Only show verification modal if the edge function specifically indicates a pending email change
      if (emailCheckData && emailCheckData.status === 'pending') {
        debug('Pending email change found, showing verification modal');
        return openVerificationModal();
      }

      debug('No pending email change, proceeding with sign in');
      
      // No pending change, proceed with normal sign-in
      const { data, error } = await signIn(email, password);

      if (error) {
        debug('signIn error', error);

        // DON'T automatically show verification modal for any 400 error
        // Instead, check if the error message specifically indicates verification needed
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('confirm') || 
          errorMessage.includes('verification') || 
          errorMessage.includes('verify')
        ) {
          debug('Error indicates verification needed');
          return openVerificationModal();
        }

        // For all other errors, show the generic error message
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
          {showForgotPassword ? (
            <>
              <header className="text-center">
                <h1 className="text-3xl font-bold">Welcome back</h1>
                <p className="mt-2 text-gray-600">Reset your password</p>
              </header>
              <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />
            </>
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
                  
                  {/* Links on the same line with space between */}
                  <div className="flex justify-between items-center">
                    <button 
                      type="button" 
                      onClick={() => setShowForgotPassword(true)} 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                    
                    <Link to="/signup" className="text-sm text-primary hover:underline">
                      Don't have an account? Sign up
                    </Link>
                  </div>
                </div>

                {errorMsg && <p className="text-center text-sm font-medium text-red-600 -mt-2">{errorMsg}</p>}

                <Button type="submit" className="w-full" disabled={loading || !emailValid || !passwordValid}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>

                <SocialLogin onGoogleSignIn={handleGoogleSignIn} />
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />

      <EmailVerificationModal
        isOpen={showVerificationModal}
        email={email}
        onVerified={handleVerificationFinished}
        onCancel={() => setShowVerificationModal(false)}
      />
    </div>
  );
};

export default Login;
