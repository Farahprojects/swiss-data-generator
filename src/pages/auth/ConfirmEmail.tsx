
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const ConfirmEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        // Get token and type from URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Handle both email confirmation and email change
        if (type !== 'signup' && type !== 'email_change') {
          setStatus('error');
          setMessage('Invalid verification link type.');
          return;
        }
        
        // Attempt to verify the email based on the type
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'signup' | 'email_change'
        });
        
        if (error) {
          console.error('Error verifying email:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may have expired.');
        } else {
          setStatus('success');
          
          if (type === 'signup') {
            setMessage('Your email has been successfully confirmed! You can now access your account.');
          } else if (type === 'email_change') {
            setMessage('Your email has been successfully changed!');
          }
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } catch (error) {
        console.error('Unexpected error during email verification:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
      }
    };
    
    processEmailVerification();
  }, [location.search, navigate]);
  
  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              {status === 'loading' ? 'Processing your verification...' : (
                status === 'success' ? 'Verification successful' : 'Verification failed'
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center py-8">
            {status === 'loading' && (
              <Loader className="h-16 w-16 text-primary animate-spin mb-4" />
            )}
            
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            )}
            
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive mb-4" />
            )}
            
            <p className="text-center mt-4">{message}</p>
            
            {status === 'success' && (
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting you to the dashboard...
              </p>
            )}
          </CardContent>
          
          <CardFooter>
            {status === 'success' ? (
              <Button 
                onClick={handleReturnToDashboard} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button 
                onClick={handleGoToLogin} 
                className="w-full"
                variant={status === 'error' ? "outline" : "default"}
              >
                Return to Login
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;
