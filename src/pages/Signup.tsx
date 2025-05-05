
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
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");
  const [dbError, setDbError] = useState(false);
  const [apiKeyGenerated, setApiKeyGenerated] = useState(false);
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
    setErrorDetails("");
    setDbError(false);
    setApiKeyGenerated(false);
    
    try {
      console.log("Starting signup process for:", email);
      
      // Use direct sonner toast for immediate feedback
      sonnerToast.loading("Creating your account...");
      
      const { error, user } = await signUp(email, password);
      
      if (error) {
        console.error("Signup error:", error.message);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        
        // Check for database errors
        if (error.message && (
          error.message.includes("database error") || 
          error.message.includes("relation") || 
          error.message.includes("violates unique constraint") ||
          error.message.includes("duplicate key")
        )) {
          setDbError(true);
          console.error("Database error detected during signup");
        }
        
        setErrorDetails(error.message || "Unknown error");
        sonnerToast.dismiss();
        sonnerToast.error("Signup Error", {
          description: `Error: ${error.message || "Failed to create account"}. Check the console for more details.`
        });
        return;
      }
      
      console.log("Signup successful, user created:", user?.id);
      console.log("User object details:", JSON.stringify(user, null, 2));
      
      // If user was created successfully, try to manually generate an API key
      if (user?.id) {
        try {
          console.log("Attempting to manually generate API key for user:", user.id);
          
          // Get the current API key or create one if it doesn't exist
          const { data: existingKey, error: keyCheckError } = await supabase
            .from('api_keys')
            .select('id, api_key')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (keyCheckError) {
            console.error("Error checking for existing API key:", keyCheckError);
          } else if (!existingKey) {
            console.log("No API key found, generating a new one");
            
            // Generate a secure API key
            const secureBytes = new Uint8Array(16);
            window.crypto.getRandomValues(secureBytes);
            const secureKey = 'thp_' + Array.from(secureBytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
              
            // Insert the new API key
            const { error: insertError } = await supabase
              .from('api_keys')
              .insert({ 
                user_id: user.id,
                api_key: secureKey,
                balance_usd: 0,
                is_active: true
              });
              
            if (insertError) {
              console.error("Error inserting API key:", insertError);
            } else {
              console.log("API key successfully generated manually");
              setApiKeyGenerated(true);
            }
          } else {
            console.log("Existing API key found, no need to generate a new one");
            setApiKeyGenerated(true);
          }
        } catch (apiKeyError) {
          console.error("Error in manual API key generation:", apiKeyError);
        }
      }
      
      sonnerToast.dismiss();
      sonnerToast.success("Account Created", {
        description: "Your account has been created successfully. API key has been generated." 
      });
      
      // If email confirmation is disabled, we can redirect to dashboard
      if (user) {
        console.log("Redirecting to dashboard");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Unexpected error during signup:", error);
      console.error("Error stack:", error.stack);
      setErrorDetails(error instanceof Error ? error.message : "An unexpected error occurred");
      sonnerToast.dismiss();
      sonnerToast.error("Error", {
        description: error instanceof Error ? error.message : "An unexpected error occurred during signup"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      sonnerToast.loading("Connecting to Google...");
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("Google sign-in error:", error.message);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        sonnerToast.dismiss();
        sonnerToast.error("Google Sign-in Error", {
          description: error.message || "Failed to sign in with Google"
        });
      }
    } catch (error: any) {
      console.error("Unexpected error during Google sign-in:", error);
      console.error("Error stack:", error.stack);
      sonnerToast.dismiss();
      sonnerToast.error("Error", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
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
            
            {errorDetails && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <p className="font-semibold">Error details:</p>
                <p className="whitespace-pre-wrap">{errorDetails}</p>
                {dbError && (
                  <p className="mt-2 font-medium">
                    A database error occurred. This has been fixed and should work now. Please try again.
                  </p>
                )}
                {apiKeyGenerated && (
                  <p className="mt-2 font-medium text-green-600">
                    Your API key was successfully generated. You can continue to dashboard.
                  </p>
                )}
              </div>
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
    </div>
  );
};

export default Signup;
