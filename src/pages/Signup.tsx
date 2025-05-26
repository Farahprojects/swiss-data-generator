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
    if (!emailValid || !passwordValid || !passwordsMatch || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      logToSupabase('User signup attempt', {
        level: 'info',
        page: 'Signup',
        data: { email: email }
      });

      // Create user without email confirmation (we'll handle it manually)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/email`
        }
      });
      
      if (error) {
        debug('Signup error', error);
        if (error.message.includes('already registered')) {
          setErrorMsg('This email is already in use.');
        } else {
          setErrorMsg(error.message);
        }
        
        logToSupabase('User signup failed', {
          level: 'error',
          page: 'Signup',
          data: { error: error.message }
        });

        setLoading(false);
        return;
      }

      // If user was created but needs verification
      if (data.user && !data.user.email_confirmed_at) {
        try {
          // Call the signup_token edge function
          const { error: functionError } = await supabase.functions.invoke('signup_token', {
            body: { user_id: data.user.id }
          });
          
          if (functionError) {
            throw new Error(functionError.message);
          }
          
          logToSupabase('User signup successful - verification email sent', {
            level: 'info',
            page: 'Signup',
            data: { email: email }
          });

          setVerificationEmail(email);
          setCurrentUserId(data.user.id);
          setSignupSuccess(true);
        } catch (emailError) {
          toast({ 
            title: 'Account Created', 
            description: 'Account created but verification email failed to send. Please contact support.', 
            variant: 'destructive' 
          });
        }
      }
      
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

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      
      // Use the same signup_token edge function with the current user ID
      const { error: functionError } = await supabase.functions.invoke('signup_token', {
        body: { user_id: currentUserId }
      });
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      toast({ 
        title: 'Verification Email Sent', 
        description: 'A new verification email has been sent to your inbox', 
        variant: 'default' 
      });
      
      logToSupabase('Verification email resent', {
        level: 'info',
        page: 'Signup',
        data: { email: verificationEmail }
      });
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message ?? 'Failed to resend verification email', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSignupForm = () => (
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
          />
        )}
      </div>

      {errorMsg && (
        <p className="text-center text-sm font-medium text-red-600">{errorMsg}</p>
      )}

      <Button 
        type="submit" 
        className="w-full"
        disabled={loading || !emailValid || !passwordValid || (showConfirmPassword && !passwordsMatch)}
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
                : 'Create an Account'}
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
