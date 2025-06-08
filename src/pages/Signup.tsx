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
import { Mail } from 'lucide-react';
import { logToSupabase } from '@/utils/batchedLogManager';
import { supabase } from '@/integrations/supabase/client';

// Debug utility
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[Signup]', ...args);
};

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle, signInWithApple, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const showConfirmPassword = password.length > 0;

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Disabled signup functionality
    toast({
      title: 'Registration Disabled',
      description: 'New account registration is temporarily disabled.',
      variant: 'destructive'
    });
    return;
  };

  const handleGoogleSignIn = async () => {
    // Disabled for now
    return;
  };
  
  const handleAppleSignIn = async () => {
    // Disabled for now
    return;
  };

  const handleResendVerification = async () => {
    // Disabled for now
    return;
  };

  const renderSignupForm = () => (
    <div className="space-y-6 opacity-50">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <EmailInput 
            email={email}
            isValid={emailValid}
            onChange={setEmail}
            onFocus={() => setErrorMsg('')}
            placeholder="Enter your email"
            disabled={true}
          />
          
          <PasswordInput
            password={password}
            isValid={passwordValid}
            showRequirements={false}
            onChange={setPassword}
            onFocus={() => setErrorMsg('')}
            disabled={true}
          />
          
          {passwordValid && (
            <p className="text-sm text-green-600">✓ Password meets requirements (8+ characters)</p>
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
              disabled={true}
            />
          )}
        </div>

        <div className="text-center text-sm font-medium text-amber-600 bg-amber-50 p-3 rounded-md">
          Registration is temporarily disabled
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={true}
        >
          Sign up
        </Button>

        <SocialLogin 
          onGoogleSignIn={handleGoogleSignIn} 
          onAppleSignIn={handleAppleSignIn}
        />

        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center flex-1">
        <h3 className="font-medium text-lg">Account created successfully!</h3>
        <p className="text-gray-700">
          A verification email has been sent to <strong>{verificationEmail}</strong>. 
          Please check your inbox and click the link in the email to verify your account.
        </p>
      </div>

      <div className="flex flex-col space-y-4 items-center">
        <div className="rounded-full bg-primary/10 p-3">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium">Check your email</h3>
          <p className="text-sm text-gray-500 mt-1">
            After verification, you'll be able to sign in to your account.
          </p>
        </div>

        <div className="flex flex-col space-y-3 w-full max-w-md mt-4">
          <Button 
            onClick={handleResendVerification} 
            variant="outline" 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </Button>
          
          <Link to="/login" className="w-full">
            <Button 
              variant="default"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold">
              {signupSuccess ? 'Email Verification' : 'Welcome to Astro by Therai'}
            </h1>
            <p className="mt-2 text-gray-600">
              {signupSuccess 
                ? 'One more step to complete your registration' 
                : 'Registration Temporarily Disabled'}
            </p>
          </header>

          {signupSuccess ? renderSuccessMessage() : renderSignupForm()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Signup;
