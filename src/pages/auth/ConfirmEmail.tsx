
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const ConfirmEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Confirming your email address...');
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get token from URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid confirmation link. No token provided.');
          return;
        }

        // The type should be 'signup' for new account confirmations
        if (type !== 'signup') {
          setStatus('error');
          setMessage('Invalid confirmation link type.');
          return;
        }
        
        // Attempt to confirm the email
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (error) {
          console.error('Error confirming email:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to confirm email. The link may have expired.');
        } else {
          setStatus('success');
          setMessage('Your email has been successfully confirmed! You can now access your account.');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
      }
    };
    
    confirmEmail();
  }, [location.search, navigate]);
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Email Confirmation</CardTitle>
            <CardDescription>
              {status === 'loading' ? 'Processing your confirmation...' : (
                status === 'success' ? 'Your email is confirmed' : 'Confirmation failed'
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
                Redirecting you to your dashboard...
              </p>
            )}
          </CardContent>
          
          <CardFooter>
            {status === 'success' ? (
              <Button 
                onClick={handleGoToDashboard} 
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
