import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [status, setStatus] = useState<'verifying' | 'valid' | 'success' | 'error'>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('Verifying reset link...');

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const processedRef = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const type = params.get('type');

      if (!token || type !== 'recovery') {
        setStatus('error');
        setMessage('Missing or invalid token.');
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' });
      if (error || !data?.session) {
        setStatus('error');
        setMessage(error?.message || 'Token verification failed.');
      } else {
        setStatus('valid');
        setMessage('Enter your new password.');
      }
    };

    verify();
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
    } else {
      setStatus('success');
      setMessage('Password updated successfully. You are now logged in.');
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <header className="w-full py-5 flex justify-center bg-white/90 backdrop-blur-md shadow-sm">
        <Logo size="md" />
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              {status === 'verifying'
                ? 'Verifying Reset Link'
                : status === 'valid'
                ? 'Create New Password'
                : status === 'success'
                ? 'Password Updated Successfully'
                : 'Reset Link Error'}
            </h1>
            <p className="text-lg text-gray-600">{message}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
            {status === 'valid' && (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-base"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-base"
                  />
                </div>

                <Button type="submit" className="w-full text-base py-3" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}

            {status === 'verifying' && (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600">Verifying your reset link...</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center text-red-600 py-12">
                <XCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg mb-6">{message}</p>
                <Button variant="outline" onClick={() => navigate('/login')} className="text-base">
                  Back to Login
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center text-emerald-600 py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg mb-6">{message}</p>
                <p className="text-gray-600 mb-6">Redirecting to dashboard...</p>
                <Button onClick={() => navigate('/dashboard')} className="text-base">
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPassword;
