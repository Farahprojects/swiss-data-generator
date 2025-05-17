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

/**
 * Login page — now **only** authenticates.
 * ────────────────────────────────────────
 * ▸ If credentials are wrong → inline error.
 * ▸ If email isn’t confirmed → toast + optional resend via `auth.resend({ type: 'signup' })`.
 *   (No more `resetPasswordForEmail` workaround here.)
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
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const emailValid = validateEmail(email);
  const passwordValid = password.length >= 6;

  /* ------------------------------------------------------------------ */
  /* Authenticated? redirect                                             */
  /* ------------------------------------------------------------------ */
  if (user) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  /* ------------------------------------------------------------------ */
  /* Handlers                                                            */
  /* ------------------------------------------------------------------ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;

    setLoading(true);
    setErrorMsg("");
    setNeedsVerification(false);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (/not confirmed|not verified/i.test(error.message)) {
          setNeedsVerification(true);
          toast({
            variant: "destructive",
            title: "Email not verified",
            description: "Please verify your email before logging in.",
          });
        } else {
          setErrorMsg("Invalid email or password");
        }
        setLoading(false);
        return;
      }

      navigate((location.state as any)?.from?.pathname || "/", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  // Unified resend using Supabase v2 "resend" helper (Signup confirmation)
  const handleResend = async () => {
    if (!emailValid) return;
    setResending(true);
    try {
      // ⬇️ 1‑liner — Supabase sends a fresh confirmation link
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — type defs may lag behind SDK
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setResending(false);
    }
  };

  const clearError = () => errorMsg && setErrorMsg("");

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex min-h-screen flex-col">
      <UnifiedNavigation />

      <div className="flex flex-grow items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          {/* Unverified notice */}
          {needsVerification && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your email isn’t verified yet. Didn’t get the link?{' '}
                <Button variant="link" size="sm" onClick={handleResend} disabled={resending}>
                  {resending ? "Sending…" : "Resend"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <EmailInput email={email} isValid={emailValid} onChange={setEmail} onFocus={clearError} />
              <PasswordInput
                password={password}
                isValid={passwordValid}
                showRequirements={false}
                onChange={setPassword}
                onFocus={clearError}
              />
            </div>

            {errorMsg && <p className="-mt-2 text-center text-sm font-medium text-red-600">{errorMsg}</p>}

            <Button type="submit" className="w-full" disabled={loading || !emailValid || !passwordValid}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <SocialLogin onGoogleSignIn={handleGoogleSignIn} />

            <p className="text-center text-sm text-gray-600">
              Don’t have an account?{' '}
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
