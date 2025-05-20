
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import PasswordInput from '@/components/auth/PasswordInput';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { extractTokenFromUrl } from '@/utils/urlUtils';

const Password = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [automaticRedirect, setAutomaticRedirect] = useState(false);
  const [secondsToRedirect, setSecondsToRedirect] = useState(10);
  
  // States for token verification
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  // Track whether we've already attempted token verification to prevent loops
  const [tokenAttempted, setTokenAttempted] = useState(false);
  
  useEffect(() => {
    console.log("Password reset component mounted");
    
    const recoveryFlow = searchParams.get('type') === 'recovery';
    const tokenParam = extractTokenFromUrl(searchParams);
    
    console.log("Password reset URL parameters:", { 
      recoveryFlow,
      hasToken: !!tokenParam,
      tokenType: tokenParam?.length > 10 ? 'hash' : 'short',
      fullUrl: window.location.href,
    });
    
    // Only attempt verification if we haven't tried yet
    if (recoveryFlow && tokenParam && !tokenAttempted) {
      console.log("Password recovery flow detected with token");
      setTokenAttempted(true);
      verifyResetToken(tokenParam);
    } else if (!tokenAttempted) {
      // No token or not a recovery flow
      console.log("⚠️ Warning: No valid token found for password reset");
      setVerifyingToken(false);
      setTokenValid(false);
      setTokenAttempted(true);
      toast({ 
        title: "Invalid or expired link", 
        description: "Please request a new password reset link.",
        variant: "destructive"
      });
    }
  }, [toast, searchParams, tokenAttempted]);

  /**
   * Verify the reset token with Supabase
   */
  const verifyResetToken = async (tokenParam: string) => {
    try {
      console.log("Verifying password reset token...");
      
      // For recovery flow, we need to use TokenHashParams
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenParam,
        type: 'recovery',
      });
      
      setVerifyingToken(false);
      
      if (error) {
        console.error("Token verification failed:", error);
        setTokenValid(false);
        toast({ 
          title: "Invalid reset link", 
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      if (data && data.session) {
        console.log("Token verified successfully, session created");
        setTokenValid(true);
      } else {
        console.error("Token verification returned no session");
        setTokenValid(false);
        toast({ 
          title: "Invalid reset link", 
          description: "Please request a new password reset link.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error verifying token:", error);
      setVerifyingToken(false);
      setTokenValid(false);
      toast({ 
        title: "Error", 
        description: error.message || "An error occurred verifying your reset link.",
        variant: "destructive"
      });
    }
  };

  /* ─────────────────────────────────────────────────────────────
   * Update password reset flow
   * ────────────────────────────────────────────────────────────*/
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({ 
        title: "Password too short", 
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting to update password...");
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Password update failed:", error);
        toast({ 
          title: "Password reset failed", 
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log("Password updated successfully");
        // Show success state
        setPasswordUpdated(true);
        
        // Start countdown for redirect
        setAutomaticRedirect(true);
        
        toast({ 
          title: "Password updated", 
          description: "Your password has been successfully reset. You'll be redirected to the dashboard shortly."
        });
        
        // Set up countdown timer
        const countdownInterval = setInterval(() => {
          setSecondsToRedirect(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              navigate('/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Clear interval on component unmount
        return () => clearInterval(countdownInterval);
      }
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reset password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to request a new password reset link
  const handleRequestNewLink = () => {
    navigate('/login?requestPasswordReset=true');
    toast({
      title: "Password Reset",
      description: "You'll be redirected to request a new password reset link."
    });
  };

  // Show success state when password is updated
  const renderSuccess = () => {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-semibold">Password Updated!</h2>
        <p>Your password has been successfully reset.</p>
        
        {automaticRedirect ? (
          <p className="text-sm text-gray-500">
            Redirecting you to the dashboard in {secondsToRedirect} seconds...
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            You can now go to the dashboard or log in with your new password.
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto">
            Go to Dashboard Now
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')} 
            className="w-full sm:w-auto"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  };

  // Render verification state
  const renderVerifying = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Verifying your reset link...</p>
      </div>
    );
  };
  
  // Error state when token is invalid
  const renderInvalidToken = () => {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Invalid Reset Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <p className="text-sm text-gray-500">Please request a new password reset link.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button 
            onClick={handleRequestNewLink}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Request New Link
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')} 
            className="w-full sm:w-auto"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  };

  // Function to render the appropriate content based on verification status
  const renderContent = () => {
    if (verifyingToken) {
      return renderVerifying();
    }
    
    if (!tokenValid) {
      return renderInvalidToken();
    }
    
    if (passwordUpdated) {
      return renderSuccess();
    }

    return (
      <form onSubmit={handlePasswordReset} className="space-y-6">
        <div className="space-y-4">
          <PasswordInput
            password={password}
            isValid={password.length >= 8}
            showRequirements={true}
            onChange={setPassword}
          />
          
          <div className="space-y-1">
            <PasswordInput
              password={confirmPassword}
              isValid={confirmPassword.length >= 8 && password === confirmPassword}
              showRequirements={false}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              id="confirm-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || password.length < 8 || password !== confirmPassword}
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </Button>
      </form>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
          <header className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="mt-2 text-gray-600">Enter your new password below</p>
          </header>

          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Password;
