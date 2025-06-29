
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { logToSupabase } from '@/utils/batchedLogManager';
import PasswordResetForm from '@/components/auth/PasswordResetForm';

const BRAND_PURPLE = '#7C3AED';

const ResetPassword: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'update-password'>('loading');
  const [message, setMessage] = useState('Resetting your password…');

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const processedRef = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        const hash = new URLSearchParams(location.hash.slice(1));

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');

        if (!accessToken || !refreshToken) throw new Error('Missing access credentials');

        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;

        logToSupabase('Password reset link verified successfully', {
          level: 'info',
          page: 'ResetPassword'
        });

        // Instead of redirecting, show the password update form
        setStatus('update-password');
        setMessage('Please set your new password');

        window.history.replaceState({}, '', '/auth/password');
      } catch (err: any) {
        logToSupabase('password reset failed', {
          level: 'error',
          page: 'ResetPassword',
          data: { error: err?.message },
        });
        setStatus('error');
        const msg = err?.message ?? 'Password reset failed – link may have expired.';
        setMessage(msg);
        toast({ variant: 'destructive', title: 'Password reset failed', description: msg });
      }
    };
    verify();
  }, [location.hash, location.search, toast]);

  const handlePasswordUpdateSuccess = () => {
    logToSupabase('Password update completed, redirecting to login', {
      level: 'info',
      page: 'ResetPassword'
    });
    
    setStatus('success');
    setMessage('Your password has been updated successfully!');
    
    toast({ 
      variant: 'success', 
      title: 'Password Updated Successfully!', 
      description: 'Please sign in with your new password.' 
    });
    
    // Redirect to login after a short delay
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  };

  const heading =
    status === 'loading' ? 'Password Reset' : 
    status === 'update-password' ? 'Set New Password' :
    status === 'success' ? 'All Set!' : 'Uh‑oh…';

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

  // Show password update form when status is 'update-password'
  if (status === 'update-password') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
        <header className="w-full py-5 flex justify-center bg-white/90 backdrop-blur-md shadow-sm">
          <Logo size="md" />
        </header>

        <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-md sm:max-w-lg md:max-w-xl"
          >
            <PasswordResetForm onSuccess={handlePasswordUpdateSuccess} />
          </motion.div>
        </main>

        <footer className="py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Theraiapi. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <header className="w-full py-5 flex justify-center bg-white/90 backdrop-blur-md shadow-sm">
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
                  ? 'Verifying reset link…'
                  : status === 'success'
                  ? 'You can now sign in with your new password.'
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
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto text-white hover:opacity-90"
                >
                  Go to Login
                </Button>
              ) : (
                <Button onClick={() => navigate('/login')} className="w-full sm:w-auto" variant="outline">
                  Return to Login
                </Button>
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

export default ResetPassword;
