
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";
import { validateEmail } from "@/utils/authValidation";
import { useNavigationState } from "@/contexts/NavigationStateContext";
import { checkForAuthRemnants, forceAuthReset } from "@/utils/authCleanup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getSafeRedirectPath } = useNavigationState();

  // Reset the invalid credentials message when user types in the forms
  useEffect(() => {
    if (invalidCredentials && (email || password)) {
      setInvalidCredentials(false);
    }
  }, [email, password, invalidCredentials]);

  // Check for login loop on mount and force cleanup if needed
  useEffect(() => {
    console.log("🔑 Login page mounted");
    console.log("🔑 Current localStorage on Login mount:", Object.keys(localStorage));
    
    const hasRemnants = checkForAuthRemnants();
    console.log("🔑 Auth remnants detected on Login mount:", hasRemnants);
    
    // If there are auth remnants, perform a thorough cleanup
    if (hasRemnants) {
      console.log("🔑 Found auth remnants on login page - performing cleanup");
      forceAuthReset(supabase).then(() => {
        console.log("🔑 Force auth reset completed on login page mount");
      });
    }
    
    // This is critical to detect if we're in a login loop
    const mountTime = new Date().toISOString();
    console.log(`🔑 Login page mount timestamp: ${mountTime}`);
    
    // Log referrer information
    console.log("🔑 Document referrer:", document.referrer);
    console.log("🔑 Previous navigation:", performance.getEntriesByType("navigation"));
    
    return () => {
      console.log("🔑 Login page unmounted");
    };
  }, []);

  // Circuit breaker to prevent infinite login attempts
  useEffect(() => {
    if (loginAttempts >= 3) {
      console.log("🔑 Circuit breaker: Too many login attempts, forcing auth reset");
      forceAuthReset(supabase).then(() => {
        toast({
          title: "Login Reset",
          description: "We've cleared your authentication state to fix potential issues.",
          variant: "default",
        });
        setLoginAttempts(0);
      });
    }
  }, [loginAttempts, toast]);

  // Log incoming location state for debugging
  useEffect(() => {
    console.log("🔑 Login page loaded with location state:", location.state);
    console.log("🔑 Current localStorage:", Object.keys(localStorage));
  }, [location]);

  // Redirect authenticated users
  if (user) {
    console.log("🔑 User already authenticated, redirecting");
    // Get the path from location state, fallback to the last saved route, or default to home
    const from = 
      (location.state?.from?.pathname) || 
      getSafeRedirectPath();
    
    console.log("🔑 Redirecting authenticated user to:", from);
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    
    setLoading(true);
    setVerificationNeeded(false);
    setInvalidCredentials(false);
    console.log("🔑 Login form submitted for:", email);
    console.log("🔑 Current localStorage before login:", Object.keys(localStorage));
    
    // Increment login attempts for circuit breaker
    setLoginAttempts(prev => prev + 1);

    try {
      // Ensure clean auth state before attempting login
      await forceAuthReset(supabase);
      
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error("🔑 Login error:", error);
        
        // Check specifically for invalid credentials error
        if (error.message?.includes("Invalid login credentials")) {
          console.log("🔑 Invalid credentials detected");
          setInvalidCredentials(true);
        }
        // Check for email verification errors
        else if (error.message?.includes("Email not confirmed") || 
            error.message?.includes("not confirmed") ||
            error.message?.includes("not verified")) {
          console.log("🔑 Email verification needed");
          setVerificationNeeded(true);
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address before logging in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to sign in",
            variant: "destructive",
          });
        }
        
        setLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: "Successfully signed in!",
      });

      // Reset circuit breaker on successful login
      setLoginAttempts(0);

      // Use the location state, navigation context, or fallback to home
      const redirectPath = 
        (location.state?.from?.pathname) || 
        getSafeRedirectPath();
      
      console.log("🔑 Login successful, redirecting to:", redirectPath);
      
      // Force a full page reload after successful login to ensure clean state
      window.location.href = redirectPath;
    } catch (error) {
      console.error("🔑 Login error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !emailValid) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address to resend verification.",
        variant: "destructive",
      });
      return;
    }

    setResendLoading(true);
    try {
      // Use Supabase's resetPasswordForEmail as a workaround to resend verification
      // This sends a password reset which can also be used to verify the email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) {
        console.error("🔑 Resend verification error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to resend verification email",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox and click the verification link.",
        });
      }
    } catch (error) {
      console.error("🔑 Resend verification error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log("Google sign in initiated");
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Toast will be shown after redirection
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          {verificationNeeded && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <p>Your email address hasn't been verified yet.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResendVerification} 
                  disabled={resendLoading}
                  className="self-start"
                >
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {invalidCredentials && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid email or password. Please try again.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <EmailInput 
                email={email}
                isValid={emailValid}
                onChange={(value) => {
                  setEmail(value);
                  setEmailValid(validateEmail(value));
                }}
              />

              <PasswordInput
                password={password}
                isValid={passwordValid}
                showRequirements={false}
                onChange={(value) => {
                  setPassword(value);
                  setPasswordValid(value.length >= 6);
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !emailValid || !passwordValid}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <SocialLogin onGoogleSignIn={handleGoogleSignIn} />

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
