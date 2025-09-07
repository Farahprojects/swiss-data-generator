import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import EmailInput from '@/components/auth/EmailInput';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLogin from '@/components/auth/SocialLogin';
import { validateEmail } from '@/utils/authValidation';
import { Mail } from 'lucide-react';

interface SignupModalProps {
  onSuccess?: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { signUp, signInWithGoogle, signInWithApple, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const showConfirmPassword = password.length > 0;

  // Handle successful signup
  useEffect(() => {
    if (user && !signupSuccess) {
      setSignupSuccess(true);
      setVerificationEmail(email);
    }
  }, [user, signupSuccess, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || !passwordsMatch) return;

    setLoading(true);
    setErrorMsg('');

    try {
      console.log('[SignupModal] Attempting signup for:', email);
      const result = await signUp(email, password);
      console.log('[SignupModal] Signup result:', { hasError: !!result.error, hasUser: !!result.user });
      
      if (result.error) {
        console.log('[SignupModal] Signup error:', result.error);
        setErrorMsg(result.error.message || 'Sign up failed');
      } else {
        // Pre-auth flow doesn't return a user until email verification
        console.log('[SignupModal] Pre-auth signup successful, verification email sent');
        setSignupSuccess(true);
        setVerificationEmail(email);
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        });
      }
    } catch (error) {
      console.log('[SignupModal] Signup exception:', error);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: 'Unable to sign up with Google. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: 'Unable to sign up with Apple. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    
    try {
      // Use the same signup function to resend verification
      const result = await signUp(verificationEmail, password);
      if (result.user) {
        toast({
          title: 'Verification email sent',
          description: 'Please check your inbox and click the verification link.',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An error occurred while resending the email.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-light text-gray-900 mb-2">
            Check your <span className="italic font-medium">email</span>
          </h2>
          <p className="text-sm text-gray-600">
            We've sent a verification link to <span className="font-medium">{verificationEmail}</span>
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResendVerification}
            disabled={loading}
            className="w-full bg-gray-900 text-white hover:bg-gray-800 font-light"
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setSignupSuccess(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full font-light"
          >
            Try a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-light text-gray-900">
          <span className="italic font-medium">Clarity Begins</span>
        </h1>
        <p className="text-sm text-gray-600">Create your account to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <EmailInput 
            email={email}
            isValid={emailValid}
            onChange={setEmail}
            onFocus={() => setErrorMsg('')}
            placeholder="Enter your email"
          />
          
          <PasswordInput
            password={password}
            isValid={passwordValid}
            showRequirements={false}
            onChange={setPassword}
            onFocus={() => setErrorMsg('')}
            placeholder="Create a password"
          />
          
          {passwordValid && (
            <p className="text-sm text-green-600 font-light">✓ Password meets requirements (8+ characters)</p>
          )}
          
          {showConfirmPassword && (
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
          )}
        </div>

        {errorMsg && (
          <div className="text-center text-sm text-red-600 font-light">
            {errorMsg}
          </div>
        )}

        <Button 
          type="submit"
          size="lg"
          className="w-full py-3 text-base font-light bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300 rounded-lg"
          disabled={!emailValid || !passwordValid || !passwordsMatch || loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <SocialLogin onGoogleSignIn={handleGoogleSignIn} onAppleSignIn={handleAppleSignIn} />
    </div>
  );
};

export default SignupModal;
