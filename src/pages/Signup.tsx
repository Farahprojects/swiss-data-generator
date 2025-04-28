
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuthForm } from "@/hooks/useAuthForm";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [planType, setPlanType] = useState<string>("");
  const [searchParams] = useSearchParams();
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formState, updateEmail, updatePassword, updateConfirmPassword } = useAuthForm(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const success = searchParams.get("success");
      const sessionId = searchParams.get("session_id");
      
      if (success === "true" && sessionId) {
        if (sessionId === "{CHECKOUT_SESSION_ID}") {
          toast({
            title: "Error",
            description: "Invalid checkout session",
            variant: "destructive",
          });
          return;
        }

        setLoadingEmail(true);
        try {
          console.log("Verifying payment session:", sessionId);
          
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId }
          });

          if (error) {
            console.error("Payment verification error:", error);
            toast({
              title: "Verification Error",
              description: error.message || "Could not verify payment",
              variant: "destructive",
            });
            return;
          }

          if (data?.email) {
            console.log("Setting customer email from Stripe:", data.email);
            setCustomerEmail(data.email);
            // Only update form state if we don't have a customer email yet
            if (!customerEmail) {
              updateEmail(data.email);
            }
            setPlanType(searchParams.get("plan") || "");
          }
        } catch (err) {
          console.error("Error during verification:", err);
          toast({
            title: "Error",
            description: "Failed to verify payment. Please contact support.",
            variant: "destructive",
          });
        } finally {
          setLoadingEmail(false);
        }
      }
    };

    verifyPayment();
  }, [searchParams, toast, customerEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Always use customerEmail if available, otherwise use form state email
      const emailToUse = customerEmail || formState.email;
      console.log("Using email for signup:", emailToUse);
      
      const { error, user } = await signUp(emailToUse, formState.password);
      
      if (error) {
        toast({
          title: "Signup Error",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
        console.error("Detailed signup error:", error);
      } else if (user) {
        // Create user record with payment information
        if (planType) {
          const { data: createUserData, error: createUserError } = await supabase.rpc('create_user_after_payment', {
            user_id: user.id,
            plan_type: planType || 'starter'
          });
          
          if (createUserError) {
            console.error("Error creating user record:", createUserError);
            toast({
              title: "Account Created",
              description: "Your account was created, but we couldn't set up your subscription. Please contact support.",
            });
          } else {
            toast({
              title: "Account Created",
              description: "Your account has been created successfully with your " + planType + " subscription!",
            });
          }
        } else {
          toast({
            title: "Account Created",
            description: "Your account has been created successfully!",
          });
        }
        
        navigate("/dashboard");
      } else {
        toast({
          title: "Success",
          description: "Please check your email to confirm your account",
        });
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

          {loadingEmail ? (
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-gray-700">Retrieving your information...</p>
            </div>
          ) : planType && (
            <Alert className="mb-6">
              <AlertDescription>
                Great! You've selected the {planType} plan. Please create your account to start using our services.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <EmailInput 
                email={customerEmail || formState.email}
                isValid={formState.emailValid}
                onChange={(email) => {
                  // Only allow email changes if we don't have a customer email from Stripe
                  if (!customerEmail) {
                    updateEmail(email);
                  }
                }}
                disabled={!!customerEmail}
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

