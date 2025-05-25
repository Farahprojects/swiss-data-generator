import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { useToast } from "@/hooks/use-toast";
import { logToSupabase } from "@/utils/batchedLogManager";

const ConfirmEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        // First, check if we have hash parameters in the URL (access_token, etc.)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        logToSupabase("Processing email verification", {
          level: 'debug',
          page: 'ConfirmEmail',
          data: { 
            hasHashParams: !!(accessToken && refreshToken),
            type,
            url: window.location.href
          }
        });

        // If we have tokens in the URL hash, use them to set the session
        if (accessToken && refreshToken) {
          logToSupabase('Found tokens in URL hash, setting session', {
            level: 'info',
            page: 'ConfirmEmail'
          });
          
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            logToSupabase('Error setting session', {
              level: 'error',
              page: 'ConfirmEmail',
              data: { error: sessionError.message }
            });
            
            setStatus('error');
            setMessage('Failed to authenticate with the provided tokens.');
            
            toast({
              variant: "destructive",
              title: "Authentication failed",
              description: "We couldn't authenticate you with the provided tokens."
            });
            return;
          }
          
          // Verify the session was set correctly
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            logToSupabase('No valid session after setSession', {
              level: 'error',
              page: 'ConfirmEmail'
            });
            
            setStatus('error');
            setMessage('Failed to establish a valid session.');
            return;
          }
          
          // If we're here, we have a valid session
          setStatus('success');
          setMessage(type === 'signup' ? 
            'Your email has been verified and you are now logged in!' : 
            'Your email has been changed successfully and you are now logged in!'
          );
          
          toast({
            variant: "success",
            title: type === 'signup' ? "Email verified!" : "Email changed!",
            description: "You have been successfully authenticated."
          });
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          
          return;
        }
        
        // If no hash params, proceed with token from query params
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token'); // Use the actual token, not token_hash
        const queryType = searchParams.get('type');
        
        logToSupabase("Checking query parameters", {
          level: 'debug',
          page: 'ConfirmEmail',
          data: { 
            hasToken: !!token,
            queryType,
            searchParams: location.search
          }
        });
        
        if (!token) {
          logToSupabase('No token found in URL', {
            level: 'error',
            page: 'ConfirmEmail',
            data: { searchParams: location.search }
          });
          
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Handle both email confirmation and email change
        if (queryType !== 'signup' && queryType !== 'email_change') {
          logToSupabase('Invalid verification link type', {
            level: 'error',
            page: 'ConfirmEmail',
            data: { queryType }
          });
          
          setStatus('error');
          setMessage('Invalid verification link type.');
          return;
        }
        
        logToSupabase('Attempting to verify OTP with token', {
          level: 'info',
          page: 'ConfirmEmail',
          data: { queryType }
        });
        
        // Attempt to verify the email using the actual token
        const { error } = await supabase.auth.verifyOtp({
          token: token, // Use the actual token
          type: queryType as 'signup' | 'email_change'
        });
        
        if (error) {
          logToSupabase('Error verifying email', {
            level: 'error',
            page: 'ConfirmEmail',
            data: { error: error.message }
          });
          
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may have expired.');
          
          toast({
            variant: "destructive",
            title: "Verification failed",
            description: "We couldn't verify your email. Please try again or request a new link."
          });
        } else {
          // Check if we got a session after verification
          const { data: sessionData } = await supabase.auth.getSession();
          
          logToSupabase('Email verification successful', {
            level: 'info',
            page: 'ConfirmEmail',
            data: { 
              hasSession: !!sessionData.session,
              queryType
            }
          });
          
          if (sessionData.session) {
            setStatus('success');
            
            if (queryType === 'signup') {
              setMessage('Your email has been successfully confirmed! You are now logged in.');
              toast({
                variant: "success",
                title: "Email verified!",
                description: "Your account has been successfully activated and you are now logged in."
              });
            } else if (queryType === 'email_change') {
              setMessage('Your email has been successfully changed! You are now logged in.');
              toast({
                variant: "success",
                title: "Email updated!",
                description: "Your email address has been successfully changed and you are now logged in."
              });
            }
            
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          } else {
            // If verification worked but we don't have a session, user needs to log in
            setStatus('success');
            setMessage('Your email has been verified. Please log in to continue.');
            
            toast({
              variant: "success",
              title: "Email verified!",
              description: "Please log in to access your account."
            });
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        }
      } catch (error) {
        logToSupabase('Unexpected error during email verification', {
          level: 'error',
          page: 'ConfirmEmail',
          data: { error: error instanceof Error ? error.message : String(error) }
        });
        
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again later.');
        
        toast({
          variant: "destructive",
          title: "Verification error",
          description: "An unexpected error occurred during verification."
        });
      }
    };
    
    processEmailVerification();
  }, [location.search, navigate, toast]);
  
  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="w-full py-4 px-6 flex justify-center border-b bg-white shadow-sm">
        <Logo size="md" />
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                {status === 'loading' ? 'Email Verification' : 
                 status === 'success' ? 'Verification Successful' : 'Verification Failed'}
              </CardTitle>
              <CardDescription>
                {status === 'loading' ? 'Processing your verification...' : 
                 status === 'success' ? 'Your email has been verified' : 'We encountered an issue'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center py-8">
              <div className="mb-4">
                {status === 'loading' && (
                  <div className="rounded-full bg-primary/10 p-3">
                    <Loader className="h-14 w-14 text-primary animate-spin" />
                  </div>
                )}
                
                {status === 'success' && (
                  <div className="rounded-full bg-green-50 p-3">
                    <CheckCircle className="h-14 w-14 text-green-500" />
                  </div>
                )}
                
                {status === 'error' && (
                  <div className="rounded-full bg-red-50 p-3">
                    <XCircle className="h-14 w-14 text-red-500" />
                  </div>
                )}
              </div>
              
              <p className="text-center text-gray-700 mt-4 max-w-xs">{message}</p>
              
              {status === 'success' && message.includes('logged in') && (
                <p className="text-sm text-muted-foreground mt-3">
                  Redirecting you to the dashboard in a moment...
                </p>
              )}
              
              {status === 'success' && message.includes('Please log in') && (
                <p className="text-sm text-muted-foreground mt-3">
                  Redirecting you to the login page in a moment...
                </p>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              {status === 'success' ? (
                <Button 
                  onClick={handleReturnToDashboard} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleGoToLogin} 
                    className="w-full"
                    variant={status === 'error' ? "default" : "outline"}
                  >
                    Return to Login
                  </Button>
                  
                  {status === 'error' && (
                    <Button 
                      asChild
                      variant="outline" 
                      className="w-full"
                    >
                      <Link to="/signup">Create New Account</Link>
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              className="text-gray-500 hover:text-gray-800" 
              onClick={handleGoToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="py-4 text-center text-sm text-gray-500 bg-white border-t">
        <p>© {new Date().getFullYear()} Theraiapi. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ConfirmEmail;
