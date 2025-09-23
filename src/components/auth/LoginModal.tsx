import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import EmailInput from '@/components/auth/EmailInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLogin from '@/components/auth/SocialLogin';
import { validateEmail } from '@/utils/authValidation';
import { LoginVerificationModal } from '@/components/auth/LoginVerificationModal';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { supabase } from '@/integrations/supabase/client';

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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // ————————————————————————————————————————————————
  // Handle successful authentication
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (!authLoading && user && !showVerificationModal && !isPendingEmailCheck) {
      onSuccess?.();
    }
  }, [authLoading, user, showVerificationModal, isPendingEmailCheck, onSuccess]);

  // ————————————————————————————————————————————————
  // Show verification modal automatically when flagged by AuthContext
  // ————————————————————————————————————————————————
  useEffect(() => {
    if (pendingEmailAddress && !isPendingEmailCheck) {
      setShowVerificationModal(true);
    }
  }, [pendingEmailAddress, isPendingEmailCheck]);

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
  // Verification handlers
  // ————————————————————————————————————————————————
  const handleResendVerification = async () => {
    try {
      // Use the same resend verification function as signup flow
      const { data, error } = await supabase.functions.invoke('resend-verification', {
        body: { email }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send verification email');
      }

      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox (and spam folder).',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message ?? 'Failed to resend verification email. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleVerificationFinished = () => {
    setShowVerificationModal(false);
    onSuccess?.();
  };

  const handleVerificationCancelled = () => {
    setShowVerificationModal(false);
    clearPendingEmail();
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

        {errorMsg && (
          <div className="text-center space-y-3">
            <div className="text-red-600 text-sm font-light">{errorMsg}</div>
            {errorMsg.toLowerCase().includes('confirm') || errorMsg.toLowerCase().includes('verification') || errorMsg.toLowerCase().includes('verify') ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleResendVerification()}
                className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100 active:text-gray-800"
              >
                Resend verification email
              </Button>
            ) : null}
          </div>
        )}

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

      {/* Verification Modal */}
      {showVerificationModal && (
        <LoginVerificationModal
          isOpen={showVerificationModal}
          email={pendingEmailAddress || email}
          currentEmail={user?.email || ''}
          pendingEmail={pendingEmailAddress}
          resendVerificationEmail={async (email: string) => {
            await handleResendVerification();
            return { error: new Error('') };
          }}
          onVerified={handleVerificationFinished}
          onCancel={handleVerificationCancelled}
        />
      )}
    </div>
  );
};

export default LoginModal;
