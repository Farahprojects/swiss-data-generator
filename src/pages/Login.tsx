
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
import { useNavigationState } from "@/contexts/NavigationStateContext";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getSafeRedirectPath } = useNavigationState();

  // Redirect authenticated users
  if (user) {
    console.log("User already authenticated, redirecting");
    // Get the path from location state, fallback to the last saved route, or default to dashboard
    const from = 
      (location.state?.from?.pathname) || 
      getSafeRedirectPath();
    
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    
    setLoading(true);
    console.log("Login form submitted for:", email);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully signed in!",
      });

      // Use the location state, navigation context, or fallback to dashboard
      const redirectPath = 
        (location.state?.from?.pathname) || 
        getSafeRedirectPath();
      
      console.log("Login successful, redirecting to:", redirectPath);
      
      // Force a full page reload after successful login to ensure clean state
      window.location.href = redirectPath;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive",
      });
      setLoading(false);
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
