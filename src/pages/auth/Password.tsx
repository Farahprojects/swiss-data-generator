import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import PasswordResetForm from '@/components/auth/PasswordResetForm';

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

        // Instead of redirecting, show the password update form
        setStatus('update-password');
        setMessage('Please set your new password');

        window.history.replaceState({}, '', '/auth/password');
      } catch (err: any) {
        setStatus('error');
        const msg = err?.message ?? 'Password reset failed – link may have expired.';
        setMessage(msg);
        toast({ variant: 'destructive', title: 'Password reset failed', description: msg });
      }
    };
    verify();
  }, [location.hash, location.search, toast]);

  const handlePasswordUpdateSuccess = () => {
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
      ? 'bg-blue-100 text-blue-600'
      : status === 'success'
      ? 'bg-green-100 text-green-600'
      : 'bg-red-100 text-red-600';

  // Show password update form when status is 'update-password'
  if (status === 'update-password') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
        <header className="w-full py-8 flex justify-center bg-white/90 backdrop-blur-md shadow-sm">
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

        <footer className="py-8 text-center text-xs text-gray-500 font-light">
          © {new Date().getFullYear()} therai. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <header className="w-full py-8 flex justify-center bg-white/90 backdrop-blur-md shadow-sm">
        <Logo size="md" />
      </header>

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md sm:max-w-lg md:max-w-xl"
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-light text-gray-900">
                {heading}
              </h2>
              <p className="text-gray-600 font-light leading-relaxed">
                {status === 'loading'
                  ? 'Verifying reset link…'
                  : status === 'success'
                  ? 'You can now sign in with your new password.'
                  : 'We encountered a problem.'}
              </p>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <motion.div
                className={`flex items-center justify-center h-20 w-20 rounded-full ${bgColor}`}
                animate={status}
                variants={iconVariants}
              >
                <Icon className="h-10 w-10" />
              </motion.div>
              
              <p className="text-center text-gray-700 font-light leading-relaxed max-w-sm">
                {message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {status === 'success' ? (
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 font-light px-8 py-4 rounded-xl text-lg"
                >
                  Go to Login
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full sm:w-auto border-gray-900 text-gray-900 hover:bg-gray-50 font-light px-8 py-4 rounded-xl text-lg" 
                  variant="outline"
                >
                  Return to Login
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="py-8 text-center text-xs text-gray-500 font-light">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPassword;
