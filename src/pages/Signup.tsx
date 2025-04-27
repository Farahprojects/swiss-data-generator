import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuthForm } from "@/hooks/useAuthForm";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLogin from "@/components/auth/SocialLogin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { paymentSession } from "@/services/payment-session";
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
    const getCustomerEmail = async () => {
      const success = searchParams.get("success");
      const sessionId = searchParams.get("session_id");

      if (success === "true" && sessionId) {
        setLoadingEmail(true);
        try {
          // Try to get email from stripe_users table first
          const { data: stripeUser, error } = await supabase
            .from('stripe_users')
            .select('email, plan_name')
            .eq('stripe_subscription_id', sessionId)
            .maybeSingle();

          if (stripeUser?.email) {
            setCustomerEmail(stripeUser.email);
            updateEmail(stripeUser.email);
            setPlanType(stripeUser.plan_name || "");
          } else {
            // Fallback to session storage if no data in stripe_users
            const sessionData = paymentSession.get();
            if (sessionData?.email) {
              setCustomerEmail(sessionData.email);
              updateEmail(sessionData.email);
              setPlanType(sessionData.planType || "");
            }
          }
        } catch (error) {
          console.error("Error retrieving customer email:", error);
        } finally {
          setLoadingEmail(false);
        }
      }
    };

    getCustomerEmail();
  }, [searchParams, updateEmail]);

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
        const success = await createUserRecord(user.id);
        
        if (success) {
          toast({
            title: "Account Created",
            description: "Your account has been created successfully!",
          });
          
          // Clear payment session after successful user creation
          paymentSession.clear();
          
          // Redirect to dashboard
          navigate("/dashboard");
        } else {
          toast({
            title: "Account Created",
            description: "Your account was created, but we couldn't set up your subscription. Please contact support.",
          });
          navigate("/dashboard");
        }
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

  const createUserRecord = async (userId: string) => {
    try {
      const sessionData = paymentSession.get();
      if (!sessionData) return false;

      // Use the new create_user_after_payment RPC function
      const { data, error } = await supabase.rpc('create_user_after_payment', {
        user_id: userId,
        plan_type: sessionData.planType || 'starter'
      });

      if (error) {
        console.error("Error creating user record:", error);
        return false;
      }

      // If there are add-ons, enable them
      if (sessionData.addOns && sessionData.addOns.length > 0) {
        for (const addon of sessionData.addOns) {
          let addonKey = '';
          
          if (addon.toLowerCase().includes('transit')) {
            addonKey = 'transits';
          } else if (addon.toLowerCase().includes('relationship') || addon.toLowerCase().includes('compatibility')) {
            addonKey = 'relationship';
          } else if (addon.toLowerCase().includes('yearly') || addon.toLowerCase().includes('cycle')) {
            addonKey = 'yearly_cycle';
          }

          if (addonKey) {
            await supabase.rpc('toggle_addon', {
              user_id_param: userId,
              addon_name: addonKey,
              enabled: true
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error in user provisioning:", error);
      return false;
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
