import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
      <header className="w-full py-5 flex justify-center bg-white/90 backdrop-bl-md shadow-sm">
        <Logo size="md" />
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold text-gray-900">
              {status === 'verifying'
                ? 'Verifying...'
                : status === 'valid'
                ? 'Reset Password'
                : status === 'success'
                ? 'Success'
                : 'Error'}
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>

          <CardContent>
            {status === 'valid' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Reset Password'}
                </Button>
              </form>
            )}

            {status === 'verifying' && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="animate-spin h-6 w-6 text-gray-600" />
              </div>
            )}

            {status === 'error' && (
              <div className="text-center text-red-600 py-8">
                <XCircle className="w-10 h-10 mx-auto mb-2" />
                <p>{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center text-emerald-600 py-8">
                <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                <p>{message}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center bg-gray-50">
            {(status === 'error' || status === 'success') && (
              <Button variant="outline" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPassword;
