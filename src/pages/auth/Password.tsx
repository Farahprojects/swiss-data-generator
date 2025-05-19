
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cleanupAuthState } from '@/utils/authCleanup';

const Password = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  
  // Extract the token from the URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    console.log("Password reset page mounted, token:", token ? "exists" : "missing");
    console.log("Type parameter:", type);

    // Clean up any existing auth state to prevent interference
    cleanupAuthState();
    
    if (!token) {
      console.error("No token provided in URL");
      setTokenValid(false);
      setVerifying(false);
      toast({ 
        title: "Missing token", 
        description: "Password reset link is invalid or expired.",
        variant: "destructive"
      });
      return;
    }

    // Verify the token but don't update the password yet
    const verifyToken = async () => {
      try {
        console.log(`Verifying password reset token: ${token.substring(0, 10)}...`);
        setVerifying(true);
        
        // Only verify the token, don't update password yet
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
          console.log("Token successfully verified, setting flag and redirecting");
          setTokenValid(true);
          
          // Set flag in localStorage to indicate password reset is needed
          localStorage.setItem('password_reset_required', 'true');
          
          // Redirect to dashboard with token in URL
          setRedirecting(true);
          navigate(`/dashboard?token=${token}&type=recovery`);
        }
      } catch (error: any) {
        console.error("Token verification error:", error);
        setTokenValid(false);
        toast({ 
          title: "Verification error", 
          description: error.message || "Failed to verify reset token.",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, toast, navigate, type]);

  // Show verification state
  const renderVerifying = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Verifying your reset link...</p>
        {redirecting && (
          <p className="text-sm text-gray-500">
            Redirecting you to set your new password...
          </p>
        )}
      </div>
    );
  };
  
  // Error state when token is invalid
  const renderInvalidToken = () => {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold text-red-600">Invalid Reset Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto"
          >
            Back to Login
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  };

  // Function to render the appropriate content based on token validity
  const renderContent = () => {
    if (verifying) {
      return renderVerifying();
    }
    
    if (tokenValid === null) {
      return <div className="text-center">Verifying reset link...</div>;
    }
    
    if (tokenValid === false) {
      return renderInvalidToken();
    }

    // If token is valid, we should never reach here as we'll redirect
    return (
      <div className="text-center">
        <p>Redirecting to password reset form...</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
          <header className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="mt-2 text-gray-600">We're verifying your reset link</p>
          </header>

          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Password;
