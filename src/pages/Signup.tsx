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
  const { signUp, signInWithGoogle, signInWithApple, user } = useAuth();

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
    
    if (!emailValid) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    
    if (!passwordValid) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }
    
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    
    try {
      debug('Attempting signup for:', email);
      
      const { error, user: newUser } = await signUp(email, password);
      
      if (error) {
        debug('Signup error:', error);
        
        if (error.message.includes('User already registered')) {
          setErrorMsg('An account with this email already exists. Try signing in instead.');
        } else if (error.message.includes('Password should be at least')) {
          setErrorMsg('Password must be at least 6 characters long');
        } else if (error.message.includes('Invalid email')) {
          setErrorMsg('Please enter a valid email address');
        } else {
          setErrorMsg(error.message || 'An error occurred during signup');
        }
        
        logToSupabase('Signup failed', {
          level: 'warn',
          page: 'Signup',
          data: { email, error: error.message }
        });
        
        return;
      }

      if (newUser) {
        debug('Signup successful, user created:', newUser.id);
        
        // Send verification email
        try {
          const { data, error: tokenError } = await supabase.functions.invoke('signup_token', {
            body: { user_id: newUser.id }
          });
          
          if (tokenError) {
            console.error('Error sending verification email:', tokenError);
            toast({
              title: 'Account Created',
              description: 'Your account was created but there was an issue sending the verification email. Please contact support.',
              variant: 'destructive'
            });
          } else {
            debug('Verification email sent successfully');
          }
        } catch (emailError) {
          console.error('Exception sending verification email:', emailError);
        }

        setVerificationEmail(email);
        setCurrentUserId(newUser.id);
        setSignupSuccess(true);
        
        logToSupabase('Signup successful', {
          level: 'info',
          page: 'Signup',
          data: { email, userId: newUser.id }
        });
      }
    } catch (err: any) {
      debug('Signup exception:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
      
      logToSupabase('Signup exception', {
        level: 'error',
        page: 'Signup',
        data: { email, error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      debug('Attempting Google sign in');
      const { error } = await signInWithGoogle();
      
      if (error) {
        debug('Google sign in error:', error);
        setErrorMsg(error.message || 'Google sign in failed');
        
        logToSupabase('Google sign in failed', {
          level: 'warn',
          page: 'Signup',
          data: { error: error.message }
        });
      }
    } catch (err: any) {
      debug('Google sign in exception:', err);
      setErrorMsg('An error occurred with Google sign in');
      
      logToSupabase('Google sign in exception', {
        level: 'error',
        page: 'Signup',
        data: { error: err.message }
      });
    }
  };
  
  const handleAppleSignIn = async () => {
    try {
      debug('Attempting Apple sign in');
      const { error } = await signInWithApple();
      
      if (error) {
        debug('Apple sign in error:', error);
        setErrorMsg(error.message || 'Apple sign in failed');
        
        logToSupabase('Apple sign in failed', {
          level: 'warn',
          page: 'Signup',
          data: { error: error.message }
        });
      }
    } catch (err: any) {
      debug('Apple sign in exception:', err);
      setErrorMsg('An error occurred with Apple sign in');
      
      logToSupabase('Apple sign in exception', {
        level: 'error',
        page: 'Signup',
        data: { error: err.message }
      });
    }
  };

  const handleResendVerification = async () => {
    if (!currentUserId) {
      toast({
        title: 'Error',
        description: 'Unable to resend verification email. Please try signing up again.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('signup_token', {
        body: { user_id: currentUserId }
      });
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to resend verification email. Please try again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Email Sent',
          description: 'Verification email has been resent. Please check your inbox.',
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

  const renderSignupForm = () => (
    <div className="bg-white rounded-2xl border border-gray-200/50 p-8 shadow-lg shadow-gray-200/50 backdrop-blur-sm">
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
            label="Password"
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
          <div className="text-center text-sm text-red-600 bg-red-50/30 p-3 rounded-xl font-light">
            {errorMsg}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-light text-base rounded-xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-lg shadow-gray-900/25"
          disabled={loading || !emailValid || !passwordValid || !passwordsMatch}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <SocialLogin 
          onGoogleSignIn={handleGoogleSignIn} 
          onAppleSignIn={handleAppleSignIn}
        />

        <p className="text-center text-sm text-gray-600 font-light">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="bg-white rounded-2xl border border-gray-200/50 p-8 shadow-lg shadow-gray-200/50 backdrop-blur-sm">
      <div className="space-y-6 animate-fade-in">
        <div className="text-center flex-1">
          <h3 className="font-light text-xl text-gray-900 tracking-tight">Account created successfully!</h3>
          <p className="text-gray-600 font-light mt-2">
            A verification email has been sent to <strong>{verificationEmail}</strong>. 
            Please check your inbox and click the link in the email to verify your account.
          </p>
        </div>

        <div className="flex flex-col space-y-4 items-center">
          <div className="rounded-full bg-gray-100 p-4">
            <Mail className="h-12 w-12 text-gray-600" />
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-light text-gray-900 tracking-tight">Check your email</h3>
            <p className="text-sm text-gray-500 mt-1 font-light">
              After verification, you'll be able to sign in to your account.
            </p>
          </div>

          <div className="flex flex-col space-y-3 w-full max-w-md mt-4">
            <Button 
              onClick={handleResendVerification} 
              variant="outline" 
              disabled={loading}
              className="w-full h-12 rounded-xl font-light border-gray-200 hover:bg-gray-50"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>
            
            <Link to="/login" className="w-full">
              <Button 
                variant="default"
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-light rounded-xl"
              >
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              {signupSuccess ? 'Email Verification' : 'Welcome to Astro by Therai'}
            </h1>
            <p className="mt-2 text-gray-600 font-light">
              {signupSuccess 
                ? 'One more step to complete your registration' 
                : 'Create your account to get started'}
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
