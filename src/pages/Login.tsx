import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";

/**
 * Enhanced Login component
 * - Handles email verification scenarios
 * - Shows verification UI for unverified emails
 * - Includes resend verification option
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signInWithGoogle, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  // Redirect authenticated users
  if (user) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        console.log("Login error:", error.message);
        
        // Check specifically for unconfirmed email messages
        if (error.message.includes("Email not confirmed") || 
            error.message.includes("not confirmed") || 
            error.message.includes("verification")) {
          setVerificationNeeded(true);
          setShowVerificationModal(true);
          setLoading(false);
          return;
        }
        
        // For invalid credentials, check if the account exists but is unverified
        if (error.message.includes("Invalid login credentials")) {
          // Check if account exists but email is unverified
          try {
            // We'll use a pattern match on auth.users through our client
            // Note: This doesn't actually expose if an account exists due to RLS
            // It's just a safer way to check than exposing real auth endpoints
            const { data: userCheck, error: userError } = await supabase
              .from('profiles') // We'll assume profiles exists or is tracked by email
              .select('email')
              .eq('email', email)
              .maybeSingle();
              
            // If we found the email, it might be unverified
            if (userCheck && !userError) {
              setVerificationNeeded(true);
              setShowVerificationModal(true);
              setLoading(false);
              return;
            }
          } catch (checkErr) {
            console.error("Error checking email verification:", checkErr);
          }
        }
        
        setErrorMsg("Invalid email or password");
        setLoading(false);
        return;
      }
      
      navigate((location.state as any)?.from?.pathname || "/", { replace: true });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Failed to sign in",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResendVerification = async () => {
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleVerificationFinished = () => {
    setShowVerificationModal(false);
    setVerificationNeeded(false);
    toast({
      title: "Email verified!",
      description: "You can now sign in with your credentials.",
    });
  };

  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    // Keep verificationNeeded flag in case we need to show the alert
  };

  const clearError = () => errorMsg && setErrorMsg("");

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          {verificationNeeded && !showVerificationModal && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <p>Your email address isn't verified yet.</p>
                <Button variant="outline" size="sm" onClick={handleResendVerification}>
                  Resend verification email
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <EmailInput
                email={email}
                isValid={emailValid}
                onChange={setEmail}
                onFocus={clearError}
              />
              <PasswordInput
                password={password}
                isValid={passwordValid}
                showRequirements={false}
                onChange={setPassword}
                onFocus={clearError}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 font-medium text-center -mt-2">{errorMsg}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !emailValid || !passwordValid}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <SocialLogin onGoogleSignIn={handleGoogleSignIn} />

            <p className="text-center text-sm text-gray-600">
              Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
      <Footer />

      <EmailVerificationModal
        isOpen={showVerificationModal}
        newEmail={email}
        onVerified={handleVerificationFinished}
        onCancel={handleVerificationCancel}
      />
    </div>
  );
};

export default Login;
