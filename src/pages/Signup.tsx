
import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";
import { validateEmail, validatePassword, validatePasswordMatch } from "@/utils/authValidation";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const { signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || !passwordsMatch) return;
    
    setLoading(true);
    try {
      console.log("Starting signup process for:", email);
      const { error, user } = await signUp(email, password);
      
      if (error) {
        console.error("Signup error:", error.message);
        toast({
          title: "Signup Error",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Signup successful, user created:", user?.id);
      toast({
        title: "Account Created",
        description: "Your account has been created successfully",
      });
      
      // If email confirmation is disabled, we can redirect to dashboard
      if (user) {
        console.log("Redirecting to dashboard");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Unexpected error during signup:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("Google sign-in error:", error.message);
        toast({
          title: "Google Sign-in Error",
          description: error.message || "Failed to sign in with Google",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error during Google sign-in:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
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
                }}
              />

              <PasswordInput
                password={password}
                isValid={passwordValid}
                onChange={(value) => {
                  setPassword(value);
                  setPasswordValid(value.length >= 6);
                  setPasswordsMatch(value === confirmPassword);
                }}
              />

              <PasswordInput
                password={confirmPassword}
                isValid={passwordsMatch}
                showRequirements={false}
                onChange={(value) => {
                  setConfirmPassword(value);
                  setPasswordsMatch(value === password);
                }}
                label="Confirm Password"
              />
            </div>

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
    </div>
  );
};

export default Signup;
