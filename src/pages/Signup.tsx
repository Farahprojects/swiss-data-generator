
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
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [planType, setPlanType] = useState<string>("");
  const [sessionVerified, setSessionVerified] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formState, updateEmail, updatePassword, updateConfirmPassword } = useAuthForm(true);
  const MAX_VERIFICATION_ATTEMPTS = 3;

  useEffect(() => {
    const getCustomerEmail = async () => {
      const success = searchParams.get("success");
      const sessionId = searchParams.get("session_id");

      if (success === "true" && sessionId && verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
        if (sessionId === "{CHECKOUT_SESSION_ID}") {
          // This means the URL wasn't properly populated by Stripe
          toast({
            title: "Error",
            description: "Invalid checkout session. Please try again or contact support.",
            variant: "destructive",
          });
          return;
        }

        setLoadingEmail(true);
        try {
          console.log("Verifying payment session:", sessionId);
          setVerificationAttempts(prev => prev + 1);
          
          // Call verify-payment to get session details and create stripe_user record
          const { data: verifyData, error: verifyError, status } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId }
          });

          if (verifyError) {
            console.error("Error verifying payment:", verifyError);
            
            // Special handling for rate limiting
            if (verifyError.message?.includes('rate limit') || status === 429) {
              const retryDelay = Math.min(5000 * verificationAttempts, 15000);
              toast({
                title: "Service Busy",
                description: `We're experiencing high traffic. Will retry in ${retryDelay/1000} seconds...`,
                variant: "default",
              });
              
              // Try again after a delay with exponential backoff
              setTimeout(() => {
                getCustomerEmail();
              }, retryDelay);
              return;
            }
            
            // Handle processing payments
            if (status === 202) {
              toast({
                title: "Payment Processing",
                description: "Your payment is still processing. We'll keep checking...",
                variant: "default",
              });
              
              // Try again after a longer delay for processing payments
              setTimeout(() => {
                getCustomerEmail();
              }, 5000);
              return;
            }
            
            // General error
            toast({
              title: "Payment Verification Error",
              description: verifyError.message || "Failed to verify payment. Please contact support.",
              variant: "destructive",
            });
            throw verifyError;
          }

          if (!verifyData) {
            console.error("No data returned from verify-payment");
            toast({
              title: "Error",
              description: "Failed to retrieve payment information. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          console.log("Payment verification successful:", verifyData);
          setSessionVerified(true);

          if (verifyData?.email) {
            setCustomerEmail(verifyData.email);
            updateEmail(verifyData.email);
            setPlanType(verifyData.planType || "");
          }
        } catch (error) {
          console.error("Error retrieving customer email:", error);
          
          if (verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
            const retryDelay = 3000;
            toast({
              title: "Verification Failed",
              description: `Retrying in ${retryDelay/1000} seconds... (Attempt ${verificationAttempts}/${MAX_VERIFICATION_ATTEMPTS})`,
              variant: "default",
            });
            
            // Try again after a delay
            setTimeout(() => {
              getCustomerEmail();
            }, retryDelay);
          } else {
            toast({
              title: "Error",
              description: "Failed to retrieve customer information. You can still create your account and contact support later.",
              variant: "destructive",
            });
          }
        } finally {
          setLoadingEmail(false);
        }
      }
    };

    getCustomerEmail();
  }, [searchParams, updateEmail, toast, verificationAttempts]);

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
      } else if (user) {
        // Create user record with payment information
        if (sessionVerified && planType) {
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
              {verificationAttempts > 1 && (
                <p className="text-sm text-gray-500 mt-2">
                  Attempt {verificationAttempts}/{MAX_VERIFICATION_ATTEMPTS}
                </p>
              )}
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
                onChange={updateEmail}
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
