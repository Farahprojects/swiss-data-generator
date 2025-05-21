import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
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
import { logToSupabase } from '@/utils/batchedLogManager';

// Debug utility
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[Signup]', ...args);
};

const Signup = () => {
  // Rest of component implementation
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, signInWithGoogle, signInWithApple, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || !passwordsMatch || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        debug('Signup error', error);
        if (error.message.includes('already registered')) {
          setErrorMsg('This email is already in use.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }
      
      // Show verification prompt
      setShowVerificationModal(true);
      setLoading(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to sign up', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({ 
          title: 'Google Sign-In Failed', 
          description: error.message, 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message ?? 'Failed to sign in with Google', 
        variant: 'destructive' 
      });
    }
  };
  
  const handleAppleSignIn = async () => {
    try {
      logToSupabase('Apple sign in initiated from signup', {
        page: 'Signup',
        level: 'info'
      });
      
      const { error } = await signInWithApple();
      
      if (error) {
        logToSupabase('Apple sign in failed from signup', {
          page: 'Signup',
          level: 'error',
          data: { errorMessage: error.message }
        });
        
        toast({ 
          title: 'Apple Sign-In Failed', 
          description: error.message, 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message ?? 'Failed to sign in with Apple', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="mt-2 text-gray-600">Get started with our application</p>
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
                showRequirements={true}
                onChange={setPassword}
                onFocus={() => setErrorMsg('')}
              />
              
              <PasswordInput
                password={confirmPassword}
                isValid={passwordValid && passwordsMatch}
                showRequirements={false}
                onChange={setConfirmPassword}
                onFocus={() => setErrorMsg('')}
                label="Confirm Password"
                placeholder="Re-enter your password"
                showMatchError={password.length > 0 && confirmPassword.length > 0 && !passwordsMatch}
              />
            </div>

            {errorMsg && (
              <p className="text-center text-sm font-medium text-red-600">{errorMsg}</p>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || !emailValid || !passwordValid || !passwordsMatch}
            >
              {loading ? 'Creating account…' : 'Sign up'}
            </Button>

            <SocialLogin 
              onGoogleSignIn={handleGoogleSignIn} 
              onAppleSignIn={handleAppleSignIn}
            />

            <p className="text-center text-sm">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>

      <Footer />

      <EmailVerificationModal
        isOpen={showVerificationModal}
        email={email}
        onVerified={() => navigate('/login')}
        onCancel={() => setShowVerificationModal(false)}
      />
    </div>
  );
};

export default Signup;
