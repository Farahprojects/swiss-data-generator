import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const EmailVerification: React.FC = () => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  const pendingEmail = localStorage.getItem('pendingEmailVerification') || user?.email || 'your email';

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: user?.id || ''
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend verification');
      }

      setResendSuccess(true);
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox and click the verification link.',
        variant: 'default'
      });

    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email');
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification email',
        variant: 'destructive'
      });
    } finally {
      setIsResending(false);
    }
  };

  const checkVerificationStatus = async () => {
    setCheckingVerification(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.email_confirmed_at) {
        // Email verified - clear pending verification and redirect
        localStorage.removeItem('pendingEmailVerification');
        localStorage.removeItem('signupTimestamp');
        
        toast({
          title: 'Email verified!',
          description: 'Welcome to TheRAI!',
          variant: 'default'
        });
        
        const from = (location.state as any)?.from?.pathname || '/chat';
        navigate(from, { replace: true });
      } else {
        toast({
          title: 'Not verified yet',
          description: 'Please check your email and click the verification link.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('pendingEmailVerification');
    localStorage.removeItem('signupTimestamp');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-light">Verify Your Email</CardTitle>
            <CardDescription className="text-gray-600">
              We've sent a verification link to <strong>{pendingEmail}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 mb-4">
                Please check your email and click the verification link to continue.
              </p>
            </div>

            {resendSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 text-sm">Verification email sent successfully!</span>
              </div>
            )}

            {resendError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{resendError}</span>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={checkVerificationStatus}
              disabled={checkingVerification}
              className="w-full"
            >
              {checkingVerification ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'I\'ve verified my email'
              )}
            </Button>
            
            <Button 
              onClick={handleResendVerification}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
            
            <Button 
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-gray-500"
            >
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
