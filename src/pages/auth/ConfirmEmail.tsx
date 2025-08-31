import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';

const BRAND_PURPLE = '#7C3AED';

const ConfirmEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const processedRef = useRef(false);

  const finishSuccess = async (kind: 'signup' | 'email_change') => {
    console.log(`[EMAIL-VERIFY] ✓ SUCCESS: ${kind} verification completed`);
    
    setMessage('Finalizing your account...');
    
    try {
      // Ensure profile exists first
      const { error: profileCreationError } = await supabase.rpc('ensure_profile_for_current_user');
      if (profileCreationError) {
        console.error('[EMAIL-VERIFY] Profile creation error:', profileCreationError);
        throw profileCreationError;
      }
      console.log('[EMAIL-VERIFY] ✓ Profile ensured');

      // Mark profile as verified with retry logic
      let verificationAttempts = 0;
      let verificationSuccess = false;
      
      while (verificationAttempts < 3 && !verificationSuccess) {
        verificationAttempts++;
        console.log(`[EMAIL-VERIFY] Attempting profile verification (attempt ${verificationAttempts})`);
        
        const { data: isVerified, error: verificationError } = await supabase.rpc('mark_profile_verified');
        
        if (verificationError) {
          console.error(`[EMAIL-VERIFY] Profile verification error (attempt ${verificationAttempts}):`, verificationError);
          if (verificationAttempts >= 3) throw verificationError;
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
          continue;
        }
        
        if (isVerified) {
          console.log('[EMAIL-VERIFY] ✓ Profile verification status updated successfully');
          verificationSuccess = true;
        } else {
          console.warn(`[EMAIL-VERIFY] Profile verification returned false (attempt ${verificationAttempts})`);
          if (verificationAttempts >= 3) {
            throw new Error('Profile verification failed after multiple attempts');
          }
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
        }
      }
      
    } catch (error) {
      console.error('[EMAIL-VERIFY] Critical profile update error:', error);
      setStatus('error');
      setMessage('Failed to finalize your account. Please try again or contact support.');
      toast({ 
        variant: 'destructive', 
        title: 'Account Setup Error', 
        description: 'Unable to complete account verification. Please try again.' 
      });
      return;
    }
    
    setStatus('success');
    const msg = kind === 'signup'
      ? 'Email verified! You may now enter the app.'
      : 'Email updated! You may now enter the app.';
    setMessage(msg);
    toast({ variant: 'success', title: 'Success', description: msg });

    window.history.replaceState({}, '', '/auth/email');
    // Remove auto-redirect - user must click button to enter
  };

  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      // Entry point logging
      const requestId = crypto.randomUUID().substring(0, 8);
      console.log(`[EMAIL-VERIFY:${requestId}] Starting verification process`);
      console.log(`[EMAIL-VERIFY:${requestId}] Full URL:`, window.location.href);
      console.log(`[EMAIL-VERIFY:${requestId}] Hash:`, location.hash);
      console.log(`[EMAIL-VERIFY:${requestId}] Search:`, location.search);

      try {
        const hash = new URLSearchParams(location.hash.slice(1));
        const search = new URLSearchParams(location.search);

        // Parameter extraction logging
        const extractedParams = {
          accessToken: !!hash.get('access_token'),
          refreshToken: !!hash.get('refresh_token'),
          pkceCode: !!hash.get('code'),
          hashType: hash.get('type'),
          token: hash.get('token') || search.get('token'),
          tokenType: hash.get('type') || search.get('type'),
          email: hash.get('email') || search.get('email'),
          newEmail: hash.get('email') || search.get('email'),
        };

        console.log(`[EMAIL-VERIFY:${requestId}] Extracted parameters:`, extractedParams);

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const pkceCode = hash.get('code');
        const newEmail = hash.get('email') || search.get('email');
        const hashType = hash.get('type');

        // Flow path determination
        if (accessToken && refreshToken) {
          console.log(`[EMAIL-VERIFY:${requestId}] → Flow: ACCESS_TOKEN method`);

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error(`[EMAIL-VERIFY:${requestId}] setSession error:`, error);
            throw error;
          }

          if (newEmail) {
            console.log(`[EMAIL-VERIFY:${requestId}] Updating user email to:`, newEmail);
            const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail });
            if (updateErr) {
              console.error(`[EMAIL-VERIFY:${requestId}] updateUser error:`, updateErr);
              throw updateErr;
            }
          }

          finishSuccess('email_change');
          return;
        }

        if (pkceCode) {
          console.log(`[EMAIL-VERIFY:${requestId}] → Flow: PKCE method`);

          const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
          if (error || !data.session) {
            console.error(`[EMAIL-VERIFY:${requestId}] exchangeCodeForSession error:`, error);
            throw error ?? new Error('No session returned');
          }

          if (newEmail) {
            console.log(`[EMAIL-VERIFY:${requestId}] Updating user email to:`, newEmail);
            const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail });
            if (updateErr) {
              console.error(`[EMAIL-VERIFY:${requestId}] updateUser error:`, updateErr);
              throw updateErr;
            }
          }

          finishSuccess('email_change');
          return;
        }

        // OTP Flow
        const token = hash.get('token') || search.get('token');
        const tokenType = hash.get('type') || search.get('type');
        const email = hash.get('email') || search.get('email');

        console.log(`[EMAIL-VERIFY:${requestId}] → Flow: OTP method`);
        console.log(`[EMAIL-VERIFY:${requestId}] OTP params - token: ${!!token}, type: ${tokenType}, email: ${email}`);

        if (!token || !tokenType || !email) {
          const missingParams = [];
          if (!token) missingParams.push('token');
          if (!tokenType) missingParams.push('type');
          if (!email) missingParams.push('email');
          
          console.error(`[EMAIL-VERIFY:${requestId}] Missing OTP parameters:`, missingParams);
          throw new Error(`Invalid link – missing: ${missingParams.join(', ')}`);
        }

        // Pre-verification logging
        console.log(`[EMAIL-VERIFY:${requestId}] Calling verifyOtp with:`, {
          tokenLength: token.length,
          type: tokenType,
          email: email,
        });

        const { error } = await supabase.auth.verifyOtp({ 
          token, 
          type: tokenType as any, 
          email 
        });
        
        if (error) {
          console.error(`[EMAIL-VERIFY:${requestId}] verifyOtp error:`, {
            message: error.message,
            status: (error as any).status,
            details: error,
          });
          throw error;
        }

        console.log(`[EMAIL-VERIFY:${requestId}] ✓ verifyOtp successful`);
        finishSuccess(tokenType.startsWith('sign') ? 'signup' : 'email_change');

      } catch (err: any) {
        console.error(`[EMAIL-VERIFY:${requestId}] ✗ VERIFICATION FAILED:`, {
          message: err?.message,
          status: err?.status,
          code: err?.code,
          details: err,
        });
        
        setStatus('error');
        const msg = err?.message ?? 'Verification failed – link may have expired.';
        setMessage(msg);
        toast({ variant: 'destructive', title: 'Verification failed', description: msg });
      }
    };
    verify();
  }, [location.hash, location.search]);

  const heading =
    status === 'loading' ? 'Email Verification' : status === 'success' ? 'All Set!' : 'Uh‑oh…';

  const iconVariants = {
    loading: {
      rotate: 360,
      transition: { repeat: Infinity, duration: 1.2 },
    },
    error: {
      scale: [1, 1.1, 1],
      rotate: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.8 },
    },
    success: {},
  };

  const Icon = status === 'loading' ? Loader : status === 'success' ? CheckCircle : XCircle;

  const bgColor =
    status === 'loading'
      ? 'bg-indigo-100 text-indigo-600'
      : status === 'success'
      ? 'bg-emerald-100 text-emerald-600'
      : 'bg-red-100 text-red-600';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <header className="w-full py-5 flex justify-center bg-white/90 backdrop-bl-md shadow-sm">
        <Logo size="md" />
      </header>

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md sm:max-w-lg md:max-w-xl"
        >
          <Card className="relative overflow-hidden border border-gray-200 shadow-xl rounded-3xl bg-white min-h-[24rem]">
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-[radial-gradient(circle_at_top_left,theme(colors.indigo.300)_0%,transparent_70%)]" />

            <CardHeader className="text-center pb-1 relative z-10 bg-white/85 backdrop-blur-sm rounded-t-3xl">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-gray-900">
                {heading}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {status === 'loading'
                  ? 'Hold tight while we confirm…'
                  : status === 'success'
                  ? 'You are verified.'
                  : 'We encountered a problem.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-6 p-10 relative z-10">
              <motion.div
                className={`flex items-center justify-center h-20 w-20 rounded-full ${bgColor}`}
                animate={status}
                variants={iconVariants}
              >
                <Icon className="h-12 w-12" />
              </motion.div>
              <p className="text-center text-lg text-gray-700 max-w-sm leading-relaxed">{message}</p>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center bg-gray-50 rounded-b-3xl relative z-10 p-6">
              {status === 'success' ? (
                <Button
                  style={{ background: BRAND_PURPLE }}
                  onClick={() => navigate('/chat')}
                  className="w-full sm:w-auto text-white hover:opacity-90"
                >
                  Go to Chat
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/login')} className="w-full sm:w-auto" variant="outline">
                    Return to Login
                  </Button>
                  {status === 'error' && (
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link to="/signup">Create Account</Link>
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  );
};

export default ConfirmEmail;
