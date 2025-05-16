
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const VerifyEmailChange = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email change...');
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const verifyEmailChange = async () => {
      try {
        // Get token from URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        if (type !== 'email_change') {
          setStatus('error');
          setMessage('Invalid verification link type.');
          return;
        }
        
        // Attempt to verify the email change
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email_change'
        });
        
        if (error) {
          console.error('Error verifying email change:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email change. The link may have expired.');
        } else {
          setStatus('success');
          setMessage('Your email has been successfully changed!');
          
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
    
    verifyEmailChange();
  }, [location.search, navigate]);
  
  const handleReturnToDashboard = () => {
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
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              {status === 'loading' ? 'Verifying your request...' : (
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
            <Button 
              onClick={handleReturnToDashboard} 
              className="w-full"
              variant={status === 'error' ? "destructive" : "default"}
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailChange;
