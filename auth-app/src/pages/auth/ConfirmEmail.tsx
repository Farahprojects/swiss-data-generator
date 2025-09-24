import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '../../components/Logo';

const ConfirmEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  const location = useLocation();
  const processedRef = useRef(false);

  const finishSuccess = async (kind: 'signup' | 'email_change', token: string, email: string) => {
    setMessage('Finalizing your account...');

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-token', {
        body: {
          token,
          email,
          type: kind
        }
      });

      // Handle already verified case gracefully
      if (error && error.message?.includes('already verified')) {
        setStatus('success');
        setMessage('Email already verified! Please sign in to continue.');
        setTimeout(() => {
          window.location.href = 'https://therai.co/login';
        }, 2000);
        return;
      }

      // Handle other errors
      if (error) {
        throw new Error(error.message || 'Verification failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Verification failed');
      }

    } catch (error) {
      // Check if it's a "token already used" error (400 status)
      if (error instanceof Error && error.message.includes('400')) {
        setStatus('success');
        setMessage('Email already verified! Please sign in to continue.');
        setTimeout(() => {
          window.location.href = 'https://therai.co/login';
        }, 2000);
        return;
      }

      // Handle other errors
      setStatus('error');
      setMessage('Failed to verify your email. Please try again or contact support.');
      return;
    }

    setStatus('success');
    const msg = kind === 'signup'
      ? 'Email verified! Please sign in to continue.'
      : 'Email updated! Please sign in to continue.';
    setMessage(msg);

    // Redirect to main app login after 3 seconds
    setTimeout(() => {
      window.location.href = 'https://therai.co/login';
    }, 3000);
  };

  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      console.log(`[AUTH-APP-CONFIRMEMAIL] 🚨 AUTH-APP CONFIRMEMAIL - Starting verification process`);

      try {
        const hash = new URLSearchParams(location.hash.slice(1));
        const search = new URLSearchParams(location.search);

        // OTP Flow
        const token = hash.get('token') || search.get('token');
        const tokenType = hash.get('type') || search.get('type');
        const email = hash.get('email') || search.get('email');

        if (!token || !tokenType || !email) {
          const missingParams = [];
          if (!token) missingParams.push('token');
          if (!tokenType) missingParams.push('type');
          if (!email) missingParams.push('email');
          
          throw new Error(`Invalid link – missing: ${missingParams.join(', ')}`);
        }

        // Call edge function to verify token and update profile
        finishSuccess(tokenType.startsWith('sign') ? 'signup' : 'email_change', token, email);

      } catch (err: any) {
        setStatus('error');
        const msg = err?.message ?? 'Verification failed – link may have expired.';
        setMessage(msg);
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
      ? 'bg-gray-100 text-gray-700'
      : status === 'success'
      ? 'bg-gray-900 text-white'
      : 'bg-red-50 text-red-600';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full py-4 flex justify-center border-b border-gray-100">
        <Logo size="sm" className="max-h-8" />
      </header>

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="text-center pb-8 px-0">
              <CardTitle className="text-4xl font-light text-gray-900 mb-3">
                {heading}
              </CardTitle>
              <CardDescription className="text-gray-600 font-light text-lg">
                {status === 'loading'
                  ? 'Verifying your email address'
                  : status === 'success'
                  ? 'Your email has been verified'
                  : 'Verification failed'}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-8 px-0">
              <motion.div
                className={`flex items-center justify-center h-16 w-16 rounded-full ${bgColor}`}
                animate={status}
                variants={iconVariants}
              >
                <Icon className="h-8 w-8" />
              </motion.div>
              <p className="text-center text-gray-600 font-light leading-relaxed max-w-sm">
                {message}
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 justify-center px-0 pt-8">
              {status === 'success' ? (
                <Button
                  onClick={() => window.location.href = 'https://therai.co/login'}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-light py-4 rounded-full"
                >
                  Sign In to Continue
                </Button>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <Button 
                    onClick={() => window.location.href = 'https://therai.co/login'} 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-light py-4 rounded-full"
                  >
                    Return to Login
                  </Button>
                  {status === 'error' && (
                    <Button 
                      onClick={() => window.location.href = 'https://therai.co/signup'}
                      variant="outline" 
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-light py-4 rounded-full"
                    >
                      Create New Account
                    </Button>
                  )}
                </div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </main>

            <footer className="py-8 text-center text-sm text-gray-500 font-light">
              © {new Date().getFullYear()} therai. All rights reserved.
              {/* Force rebuild for pill-shaped buttons */}
            </footer>
    </div>
  );
};

export default ConfirmEmail;
