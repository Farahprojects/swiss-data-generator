import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import EmailInput from '@/components/auth/EmailInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLogin from '@/components/auth/SocialLogin';
import { validateEmail } from '@/utils/authValidation';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

interface LoginModalProps {
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const { toast } = useToast();

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

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ————————————————————————————————————————————————
  // Handle successful authentication
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (!authLoading && user && !isPendingEmailCheck) {
      onSuccess?.();
    }
  }, [authLoading, user, isPendingEmailCheck, onSuccess]);


  // ————————————————————————————————————————————————
  // Form submission
  // ————————————————————————————————————————————————
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setErrorMsg(result.error.message || 'Sign in failed');
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ————————————————————————————————————————————————
  // Social login handlers
  // ————————————————————————————————————————————————
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Unable to sign in with Google. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: 'Unable to sign in with Apple. Please try again.',
        variant: 'destructive'
      });
    }
  };


  // ————————————————————————————————————————————————
  // Render
  // ————————————————————————————————————————————————
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onCancel={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-light text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-600">Sign in to your account</p>
      </div>

      {/* Form */}
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

        {errorMsg && <div className="text-red-600 text-sm text-center font-light">{errorMsg}</div>}

        <Button
          type="submit"
          size="lg"
          className="w-full py-3 text-base font-light bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300 rounded-lg"
          disabled={!emailValid || !passwordValid || loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Extras */}
      <div className="text-center space-y-4">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-light border-b border-gray-300 hover:border-gray-600 pb-1"
        >
          Forgot your password?
        </button>

        <SocialLogin onGoogleSignIn={handleGoogleSignIn} onAppleSignIn={handleAppleSignIn} />
      </div>

    </div>
  );
};

export default LoginModal;
