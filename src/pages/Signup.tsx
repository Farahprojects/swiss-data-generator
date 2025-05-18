import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";
import { validateEmail, validatePassword, validatePasswordMatch } from "@/utils/authValidation";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const { signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Helper function to get user-friendly error message
  const getUserFriendlyError = (errorMsg: string) => {
    if (errorMsg.includes("duplicate key") || errorMsg.includes("already registered")) {
      return "This email is already registered. Please use a different email or try logging in.";
    }
    if (errorMsg.includes("database error") || errorMsg.includes("relation") || errorMsg.includes("violates unique constraint")) {
      return "We're having technical issues creating your account. Please try again in a few moments.";
    }
    if (errorMsg.includes("password")) {
      return "Please check your password meets the requirements.";
    }
    if (errorMsg.includes("invalid email")) {
      return "Please enter a valid email address.";
    }
    // Default friendly message
    return "Something went wrong. Please try again or contact support if the problem persists.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || !passwordsMatch) return;
    
    setLoading(true);
    setErrorMessage("");
    
    try {
      console.log("Starting signup process for:", email);
      
      toast({
        title: "Creating your account",
        description: "Please wait a moment...",
      });
      
      const { error, user } = await signUp(email, password);
      
      if (error) {
        console.error("Signup error:", error.message);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        
        // Set user-friendly error message
        setErrorMessage(getUserFriendlyError(error.message || ""));
        
        toast({
          title: "Signup Error",
          description: getUserFriendlyError(error.message || ""),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      console.log("Signup successful, user created:", user?.id);
      
      // Show verification dialog instead of redirecting
      setShowVerificationDialog(true);
      setLoading(false);
      
    } catch (error: any) {
      console.error("Unexpected error during signup:", error);
      console.error("Error stack:", error.stack);
      
      // Set user-friendly error message for unexpected errors
      setErrorMessage("We encountered an unexpected error. Please try again later.");
      
      toast({
        title: "Error",
        description: "We encountered an unexpected error. Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      toast({
        title: "Connecting to Google",
        description: "Please wait while we connect you to Google...",
      });
      
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error("Google sign-in error:", error.message);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        
        toast({
          title: "Google Sign-in Error",
          description: "Unable to sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error during Google sign-in:", error);
      console.error("Error stack:", error.stack);
      
      toast({
        title: "Error",
        description: "We encountered an unexpected error. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCloseVerificationDialog = () => {
    setShowVerificationDialog(false);
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Create an account</h2>
            <p className="mt-2 text-gray-600">Get started with Theraiapi</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <EmailInput 
                email={email}
                isValid={emailValid}
                onChange={(value) => {
                  setEmail(value);
                  setEmailValid(validateEmail(value));
                  setErrorMessage(""); // Clear error when input changes
                }}
              />

              <PasswordInput
                password={password}
                isValid={passwordValid}
                onChange={(value) => {
                  setPassword(value);
                  setPasswordValid(value.length >= 8);
                  setPasswordsMatch(value === confirmPassword);
                  setErrorMessage(""); // Clear error when input changes
                }}
              />

              <PasswordInput
                password={confirmPassword}
                isValid={passwordsMatch}
                showRequirements={false}
                onChange={(value) => {
                  setConfirmPassword(value);
                  setPasswordsMatch(value === password);
                  setErrorMessage(""); // Clear error when input changes
                }}
                label="Confirm Password"
              />
            </div>
            
            {errorMessage && (
              <p className="text-sm text-red-600 font-medium">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !emailValid || !passwordValid || !passwordsMatch}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <SocialLogin onGoogleSignIn={handleGoogleSignIn} />

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
      <Footer />

      {/* Email Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Verification Email Sent</DialogTitle>
            <DialogDescription className="text-center">
              <div className="flex justify-center my-6">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
              </div>
              <p className="text-lg font-medium">
                We've sent a verification email to:
              </p>
              <p className="text-lg font-bold mt-2 text-primary">
                {email}
              </p>
              <p className="mt-4">
                Please check your inbox and click the verification link to activate your account. 
                After verifying your email, you can log in to access your account.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleCloseVerificationDialog} className="w-full sm:w-auto">
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Signup;
