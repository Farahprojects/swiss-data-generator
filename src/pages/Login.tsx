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

// Import the hardcoded URL directly from where it's defined
const SUPABASE_URL = "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";

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
  const [pendingEmailAddress, setPendingEmailAddress] = useState<string | undefined>(undefined);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ───────────────── Redirect if already signed‑in
  if (user) {
    // Check if we're on password reset route - don't redirect in that case
    const isPasswordResetRoute = window.location.pathname.includes('/auth/password');
    
    if (isPasswordResetRoute) {
      logToSupabase('On password reset route, not redirecting despite having a user session', {
        level: 'debug',
        page: 'Login'
      });
      return null; // Don't redirect, let the password reset component handle it
    }
    
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const openVerificationModal = (pendingTo?: string) => {
    setPendingEmailAddress(pendingTo);
    setShowVerificationModal(true);
    setLoading(false);
  };

  const checkForPendingEmailChange = async (userEmail: string) => {
    try {
      logToSupabase(`Checking for pending email change after successful login: ${SUPABASE_URL}/functions/v1/email-check`, {
        level: 'debug',
        page: 'Login'
      });
      
      const emailCheckRes = await fetch(`${SUPABASE_URL}/functions/v1/email-check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ email: userEmail }),
      });
      
      if (!emailCheckRes.ok) {
        logToSupabase('Email check failed after login, proceeding normally', {
          level: 'warn',
          page: 'Login',
          data: { status: emailCheckRes.status }
        });
        return null;
      }

      const emailCheckData = await emailCheckRes.json();
      logToSupabase('Post-login email check result', {
        level: 'debug',
        page: 'Login',
        data: { status: emailCheckData?.status }
      });
      
      return emailCheckData;
    } catch (err) {
      logToSupabase('Exception during post-login email check', {
        level: 'warn',
        page: 'Login',
        data: { error: err instanceof Error ? err.message : String(err) }
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      logToSupabase('Starting secure login flow - password validation first', {
        level: 'info',
        page: 'Login',
        data: { email }
      });

      // STEP 1: ALWAYS validate password first - this is the security fix
      const { data, error } = await signIn(email, password);

      if (error) {
        logToSupabase('Password validation failed', {
          level: 'warn',
          page: 'Login',
          data: { 
            email,
            errorCode: error.name,
            errorMessage: error.message
          }
        });

        // Check if the error message specifically indicates verification needed
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('confirm') || 
          errorMessage.includes('verification') || 
          errorMessage.includes('verify')
        ) {
          logToSupabase('Error indicates email verification needed', {
            level: 'debug',
            page: 'Login'
          });
          return openVerificationModal();
        }

        // For all other errors, show the generic error message
        setErrorMsg('Invalid email or password');
        return setLoading(false);
      }

      // STEP 2: Password was valid! Now check if user has confirmed email
      if (data?.user && !data.user.email_confirmed_at) {
        logToSupabase('User authenticated but email not confirmed', {
          level: 'debug',
          page: 'Login'
        });
        return openVerificationModal();
      }

      // STEP 3: User is fully authenticated, now check for pending email changes
      logToSupabase('User successfully authenticated, checking for pending email changes', {
        level: 'info',
        page: 'Login',
        data: { userId: data.user?.id }
      });

      const emailCheckData = await checkForPendingEmailChange(email);
      
      if (emailCheckData && emailCheckData.status === 'pending') {
        logToSupabase('Pending email change found after successful login - BLOCKING dashboard redirect', {
          level: 'info',
          page: 'Login',
          data: { 
            currentEmail: emailCheckData.current_email, 
            pendingTo: emailCheckData.pending_to 
          }
        });
        // IMPORTANT: Return here to prevent dashboard redirect
        return openVerificationModal(emailCheckData.pending_to);
      }

      // STEP 4: All good, proceed to dashboard
      logToSupabase('Login completed successfully, redirecting to dashboard', {
        level: 'info',
        page: 'Login'
      });
      
      navigate((location.state as any)?.from?.pathname || '/', { replace: true });

    } catch (err: any) {
      logToSupabase('Unexpected error during login', {
        level: 'error',
        page: 'Login',
        data: { error: err.message || String(err) }
      });
      
      toast({ 
        title: 'Error', 
        description: err.message ?? 'Failed to sign in', 
        variant: 'destructive' 
      });
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

  const handleAppleSignIn = async () => {
    try {
      logToSupabase('Apple sign in initiated', {
        page: 'Login',
        level: 'info'
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        logToSupabase('Apple sign in failed', {
          page: 'Login',
          level: 'error',
          data: { errorMessage: error.message }
        });
        throw error;
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to sign in with Apple', variant: 'destructive' });
    }
  };

  /* Callback from modal when user verified */
  const handleVerificationFinished = async () => {
    setShowVerificationModal(false);
    setPendingEmailAddress(undefined);
    toast({ title: 'Email verified!', description: 'You can now continue to your dashboard.' });

    // User is already authenticated at this point, just redirect
    navigate((location.state as any)?.from?.pathname || '/', { replace: true });
  };

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
