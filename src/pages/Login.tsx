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

/* Utility – log only in dev */
const debug = (...args: any[]) => process.env.NODE_ENV !== 'production' && console.log(...args);

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

  /* Redirect already-authenticated users */
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
      const { data, error } = await signIn(email, password);

      if (error) {
        debug('signIn error:', error);
        // SUPABASE returns 400 with generic message when email not confirmed
        const unverified =
          error.message.toLowerCase().includes('confirm') || error.message.toLowerCase().includes('verification');
        if (unverified) return openVerificationModal();

        setErrorMsg('Invalid email or password');
        return setLoading(false);
      }

      // extra guard in case Supabase stopped throwing error
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

  /* called by modal when user says “I’ve verified” */
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

  const handleVerificationCancel = () => setShowVerificationModal(false);

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

            {errorMsg && <p className="text-sm text-red-600 font-medium text-center -mt-2">{errorMsg}</p>}

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
        onCancel={handleVerificationCancel}
      />
    </div>
  );
};

export default Login;
