
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import PasswordInput from '@/components/auth/PasswordInput';
import { CheckCircle } from 'lucide-react';

const Password = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Extract the token from the URL
  const token = searchParams.get('token');

  // Log information about current session for debugging
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        // This is just informational for debugging
        const { data } = await supabase.auth.getSession();
        console.log("Password reset - current session status:", data.session ? "Has session" : "No session");
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkSessionStatus();
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        toast({ 
          title: "Missing token", 
          description: "Password reset link is invalid or expired.",
          variant: "destructive"
        });
        return;
      }

      try {
        console.log("Verifying token:", token.substring(0, 10) + "...");
        
        // Supabase verifyOtp is only to verify the token, not to update password
        // This is a needed step to validate the token before allowing password update
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

        if (error) {
          console.error("Token verification failed:", error);
          setTokenValid(false);
          toast({ 
            title: "Invalid token", 
            description: "Password reset link is invalid or expired.",
            variant: "destructive"
          });
        } else {
          console.log("Token successfully verified");
          setTokenValid(true);
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setTokenValid(false);
        toast({ 
          title: "Verification error", 
          description: "Failed to verify reset token. Please try again.",
          variant: "destructive"
        });
      }
    };

    verifyToken();
  }, [token, toast]);

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
        
        // Redirect to dashboard after a short delay (5 seconds instead of 3 for better visibility)
        toast({ 
          title: "Password updated", 
          description: "Your password has been successfully reset. You'll be redirected to the dashboard shortly."
        });
        
        setTimeout(() => {
          console.log("Redirecting to dashboard after password update");
          navigate('/dashboard');
        }, 5000);
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

  // Show success state when password is updated
  const renderSuccess = () => {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-semibold">Password Updated!</h2>
        <p>Your password has been successfully reset.</p>
        <p className="text-sm text-gray-500">Redirecting you to the dashboard in a few seconds...</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          Go to Dashboard Now
        </Button>
      </div>
    );
  };

  // Function to render the appropriate content based on token validity
  const renderContent = () => {
    if (passwordUpdated) {
      return renderSuccess();
    }
    
    if (tokenValid === null) {
      return <div className="text-center">Verifying reset link...</div>;
    }
    
    if (tokenValid === false) {
      return (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Invalid Reset Link</h2>
          <p>This password reset link is invalid or has expired.</p>
          <Button asChild>
            <Link to="/login">Back to Login</Link>
          </Button>
        </div>
      );
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
        <div className="w-full max-w-md space-y-8">
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
