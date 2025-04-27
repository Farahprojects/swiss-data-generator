
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuthForm } from "@/hooks/useAuthForm";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formState, updateEmail, updatePassword, updateConfirmPassword } = useAuthForm(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, user } = await signUp(formState.email, formState.password);
      
      if (error) {
        toast({
          title: "Signup Error",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
        console.error("Detailed signup error:", error);
      } else {
        // Check if email confirmation is required
        if (user?.identities?.length === 0 || user?.email_confirmed_at === null) {
          toast({
            title: "Success",
            description: "Please check your email to confirm your account",
          });
        } else {
          toast({
            title: "Account Created",
            description: "Your account has been created successfully! Please select a subscription plan to continue.",
          });
          // Redirect to pricing page instead of dashboard
          navigate("/pricing");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      console.error("Unexpected signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google Sign-in Error",
          description: error.message || "Failed to sign in with Google",
          variant: "destructive",
        });
        console.error("Google sign-in error:", error);
      }
      // We don't redirect here as Google OAuth will handle the redirect
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Unexpected Google sign-in error:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Create an account</h2>
            <p className="mt-2 text-gray-600">Get started with Theraiapi</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <EmailInput 
                email={formState.email}
                isValid={formState.emailValid}
                onChange={updateEmail}
              />

              <PasswordInput
                password={formState.password}
                isValid={formState.passwordValid}
                onChange={updatePassword}
              />

              {formState.showConfirmPassword && (
                <PasswordInput
                  password={formState.confirmPassword}
                  isValid={formState.passwordsMatch}
                  showRequirements={false}
                  onChange={updateConfirmPassword}
                  label="Confirm Password"
                />
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !formState.formValid}
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
